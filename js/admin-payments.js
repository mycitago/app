let paymentBiz = null;
const pay$ = id => document.getElementById(id);

function payToast(message, type = 'info') {
  const el = pay$('toast');
  if (!el) return;
  el.textContent = message;
  el.dataset.type = type;
  el.classList.remove('hidden');
  clearTimeout(window.__payToast);
  window.__payToast = setTimeout(() => el.classList.add('hidden'), 3600);
}

async function invokePaymentFunction(name, body) {
  const { data, error } = await supabaseClient.functions.invoke(name, { body });
  if (error) throw new Error(error.message || `No se pudo ejecutar ${name}`);
  if (!data?.ok) throw new Error(data?.error || 'Operación no disponible');
  return data;
}

function selectedMode() {
  return document.querySelector('input[name="collection-mode"]:checked')?.value || 'none';
}

function syncModeUi() {
  const mode = selectedMode();
  const wrap = pay$('deposit-value-wrap');
  const show = mode === 'fixed' || mode === 'percentage';
  wrap?.classList.toggle('hidden', !show);

  if (mode === 'fixed') {
    pay$('deposit-value-label').textContent = 'Anticipo fijo';
    pay$('deposit-prefix').textContent = '$';
    pay$('deposit-suffix').textContent = 'MXN';
    pay$('deposit-value').max = '';
  } else if (mode === 'percentage') {
    pay$('deposit-value-label').textContent = 'Porcentaje de anticipo';
    pay$('deposit-prefix').textContent = '';
    pay$('deposit-suffix').textContent = '%';
    pay$('deposit-value').max = '100';
  }
}

function setMercadoPagoStatus(row) {
  const pill = pay$('mercadopago-account-status');
  const copy = pay$('mercadopago-account-copy');
  const connect = pay$('connect-mercadopago');

  const connected = Boolean(row?.connected) || row?.connection_status === 'connected';
  const reauth = row?.status === 'reauth_required' || row?.connection_status === 'reauth_required';

  if (connected) {
    pill.textContent = 'Conectado';
    pill.className = 'status-pill good';
    copy.textContent = 'Cuenta lista para operar con Mercado Pago.';
    connect.textContent = 'Administrar conexión';
  } else if (reauth) {
    pill.textContent = 'Reconexión necesaria';
    pill.className = 'status-pill warn';
    copy.textContent = 'Mercado Pago requiere volver a autorizar esta cuenta.';
    connect.textContent = 'Volver a conectar';
  } else {
    pill.textContent = 'No conectado';
    pill.className = 'status-pill neutral';
    copy.textContent = 'Conecta la cuenta de Mercado Pago de tu negocio.';
    connect.textContent = 'Conectar cuenta';
  }

  const enabled = Boolean(pay$('online-payments-enabled')?.checked);
  if (pay$('payment-rules')) {
    pay$('payment-rules').disabled = !enabled || !connected;
  }
}

async function loadPaymentSettings() {
  const [settingsResult, accountResult] = await Promise.all([
    supabaseClient
      .from('business_payment_settings')
      .select('*')
      .eq('business_id', paymentBiz.id)
      .maybeSingle(),
    supabaseClient
      .from('business_payment_accounts')
      .select('provider,provider_user_id,connection_status,connected_at,livemode')
      .eq('business_id', paymentBiz.id)
      .eq('provider', 'mercadopago')
      .maybeSingle()
  ]);

  if (settingsResult.error) throw settingsResult.error;
  if (accountResult.error) throw accountResult.error;

  const s = settingsResult.data || {};
  pay$('online-payments-enabled').checked = Boolean(s.online_payments_enabled);

  const radio = document.querySelector(
    `input[name="collection-mode"][value="${s.collection_mode || 'none'}"]`
  );
  if (radio) radio.checked = true;

  pay$('deposit-value').value = Number(s.deposit_value || 0);
  pay$('prefer-card').checked = s.prefer_card !== false;
  pay$('prefer-spei').checked = Boolean(s.prefer_spei);
  pay$('prefer-oxxo').checked = Boolean(s.prefer_oxxo);

  syncModeUi();
  setMercadoPagoStatus(accountResult.data || null);
}

async function loadSubscription() {
  try {
    const { data, error } = await supabaseClient.rpc('get_business_entitlements', {
      p_business_id: paymentBiz.id
    });
    if (error) throw error;

    pay$('subscription-plan').textContent = data?.plan?.name || 'Sin plan';
    const st = data?.subscription?.status || 'sin suscripción';
    pay$('subscription-status').textContent =
      st === 'trial' ? 'Prueba' : st === 'active' ? 'Activo' : st;
  } catch (e) {
    console.warn('[MyCitaGo payments subscription]', e);
    pay$('subscription-plan').textContent = 'No disponible';
    pay$('subscription-status').textContent = '—';
  }
}

async function refreshMercadoPagoStatus(showMessage = true) {
  try {
    const data = await invokePaymentFunction('mp-connect-status', {
      business_id: paymentBiz.id
    });

    setMercadoPagoStatus({
      ...data,
      connection_status: data.status
    });

    if (showMessage) {
      if (data.connected) {
        payToast('Mercado Pago está conectado correctamente.', 'success');
      } else if (data.status === 'reauth_required') {
        payToast('Mercado Pago necesita volver a autorizarse.', 'info');
      } else {
        payToast('Mercado Pago todavía no está conectado.', 'info');
      }
    }

    return data;
  } catch (e) {
    console.warn('[MyCitaGo Mercado Pago status]', e);
    if (showMessage) {
      payToast('No se pudo actualizar Mercado Pago: ' + e.message, 'error');
    }
    return null;
  }
}

async function startMercadoPago() {
  const btn = pay$('connect-mercadopago');

  try {
    btn.disabled = true;
    btn.textContent = 'Abriendo Mercado Pago…';

    const data = await invokePaymentFunction('mp-connect-start', {
      business_id: paymentBiz.id
    });

    if (!data?.url) throw new Error('Mercado Pago no devolvió una URL de autorización.');
    location.href = data.url;
  } catch (e) {
    payToast('No se pudo abrir Mercado Pago: ' + e.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Conectar cuenta';
  }
}

async function saveSettings() {
  const mode = selectedMode();
  const value = Number(pay$('deposit-value').value || 0);

  if (mode === 'percentage' && (value <= 0 || value > 100)) {
    return payToast('El porcentaje debe estar entre 1 y 100.', 'error');
  }
  if (mode === 'fixed' && value <= 0) {
    return payToast('El anticipo fijo debe ser mayor a cero.', 'error');
  }

  if (pay$('online-payments-enabled').checked) {
    const status = await refreshMercadoPagoStatus(false);
    if (!status?.connected) {
      pay$('online-payments-enabled').checked = false;
      if (pay$('payment-rules')) pay$('payment-rules').disabled = true;
      return payToast('Primero conecta Mercado Pago antes de activar pagos online.', 'error');
    }
  }

  const payload = {
    business_id: paymentBiz.id,
    online_payments_enabled: Boolean(pay$('online-payments-enabled').checked),
    collection_mode: mode,
    deposit_value: (mode === 'fixed' || mode === 'percentage') ? value : 0,
    prefer_card: Boolean(pay$('prefer-card').checked),
    prefer_spei: Boolean(pay$('prefer-spei').checked),
    prefer_oxxo: Boolean(pay$('prefer-oxxo').checked),
    currency: 'mxn',
    updated_at: new Date().toISOString()
  };

  const { error } = await supabaseClient
    .from('business_payment_settings')
    .upsert(payload);

  if (error) return payToast('No se pudo guardar: ' + error.message, 'error');
  payToast('Configuración de pagos guardada.', 'success');
}

async function initAdminPayments() {
  const session = await requireAuth();
  if (!session) return;

  paymentBiz = await getMyBusiness(session.user);
  if (!paymentBiz) return;

  document
    .querySelectorAll('input[name="collection-mode"]')
    .forEach(x => x.addEventListener('change', syncModeUi));

  pay$('online-payments-enabled').addEventListener('change', async () => {
    if (pay$('online-payments-enabled').checked) {
      const data = await refreshMercadoPagoStatus(false);
      if (!data?.connected) {
        pay$('online-payments-enabled').checked = false;
        if (pay$('payment-rules')) pay$('payment-rules').disabled = true;
        payToast('Conecta Mercado Pago antes de activar pagos online.', 'info');
      } else if (pay$('payment-rules')) {
        pay$('payment-rules').disabled = false;
      }
    } else if (pay$('payment-rules')) {
      pay$('payment-rules').disabled = true;
    }
  });

  pay$('connect-mercadopago').onclick = startMercadoPago;
  pay$('refresh-mercadopago').onclick = () => refreshMercadoPagoStatus(true);
  pay$('save-payment-settings').onclick = saveSettings;

  try {
    await Promise.all([loadPaymentSettings(), loadSubscription()]);
  } catch (e) {
    console.error('[MyCitaGo payments]', e);
    payToast('No se pudo cargar la configuración de pagos: ' + e.message, 'error');
  }

  const qs = new URLSearchParams(location.search);
  const mpState = qs.get('mp');

  if (mpState === 'return') {
    await refreshMercadoPagoStatus(true);
    history.replaceState({}, '', location.pathname);
  } else if (mpState === 'error') {
    const reason = qs.get('reason') || 'authorization_failed';
    payToast('No se pudo conectar Mercado Pago (' + reason + ').', 'error');
    history.replaceState({}, '', location.pathname);
  }
}

document.addEventListener('DOMContentLoaded', initAdminPayments);
