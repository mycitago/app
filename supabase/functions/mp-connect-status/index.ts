// CITAGO · mp-connect-status
import { CORS, getTenantContext, json } from "../_shared/mercadopago-common.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  let stage = "start";
  try {
    stage = "tenant_context";
    const c = await getTenantContext(req);

    stage = "account_lookup";
    const { data: account, error: accountError } = await c.admin
      .from("business_payment_accounts")
      .select("provider,provider_user_id,connection_status,token_expires_at,connected_at,livemode,last_error")
      .eq("business_id", c.business_id)
      .eq("provider", "mercadopago")
      .maybeSingle();

    if (accountError) throw new Error(`payment_account_lookup_failed: ${accountError.message}`);
    if (!account) return json({ ok: true, status: "not_started", connected: false });

    stage = "secret_lookup";
    const { data: secret, error: secretError } = await c.admin
      .from("business_payment_secrets")
      .select("access_token,refresh_token,token_expires_at,provider_user_id,livemode")
      .eq("business_id", c.business_id)
      .eq("provider", "mercadopago")
      .maybeSingle();

    if (secretError) throw new Error(`payment_secret_lookup_failed: ${secretError.message}`);
    if (!secret?.access_token) {
      return json({ ok: true, status: "reauth_required", connected: false, provider_user_id: account.provider_user_id || null });
    }

    const expired = secret.token_expires_at
      ? new Date(secret.token_expires_at).getTime() <= Date.now()
      : false;

    if (expired) {
      return json({ ok: true, status: "reauth_required", connected: false, provider_user_id: secret.provider_user_id || account.provider_user_id || null });
    }

    return json({
      ok: true,
      status: account.connection_status || "connected",
      connected: true,
      provider_user_id: secret.provider_user_id || account.provider_user_id || null,
      livemode: Boolean(secret.livemode),
      token_expires_at: secret.token_expires_at || account.token_expires_at || null,
      connected_at: account.connected_at || null,
    });
  } catch (e) {
    const message = String((e as any)?.message || e);
    console.error("[mp-connect-status:failed]", { stage, message });
    return json({ ok: false, stage, error: message }, /unauthorized|forbidden/.test(message) ? 403 : 400);
  }
});
