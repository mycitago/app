import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Sesión requerida.');
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) throw new Error('Sesión inválida.');

    const body = await req.json();
    const name = String(body.business_name || '').trim();
    const phone = String(body.business_phone || '').trim();
    const requestedSlug = String(body.slug || '').trim().toLowerCase();
    const planId = String(body.plan_id || 'reserva').trim();
    if (!name) throw new Error('Nombre del negocio requerido.');
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('Teléfono internacional inválido.');

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: existing } = await admin.from('business_members').select('business_id').eq('user_id', authData.user.id).eq('status', 'active').limit(1);
    if (existing?.length) return Response.json({ ok: true, business_id: existing[0].business_id, existing: true }, { headers: corsHeaders });

    let slug = requestedSlug.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'negocio';
    for (let i = 0; i < 6; i++) {
      const { data: clash } = await admin.from('businesses').select('id').eq('slug', slug).maybeSingle();
      if (!clash) break;
      slug = `${slug.replace(/-[a-z0-9]{4}$/,'')}-${crypto.randomUUID().slice(0,4)}`;
    }

    let { data: business, error: businessError } = await admin.from('businesses').insert({ name, slug, whatsapp: phone }).select('id,slug').single();
    if (businessError && /owner_id/i.test(businessError.message || '')) {
      const retry = await admin.from('businesses').insert({ name, slug, whatsapp: phone, owner_id: authData.user.id }).select('id,slug').single();
      business = retry.data; businessError = retry.error;
    }
    if (businessError || !business) throw businessError || new Error('No se pudo crear el negocio.');

    const { error: memberError } = await admin.from('business_members').insert({ business_id: business.id, user_id: authData.user.id, role: 'OWNER', status: 'active' });
    if (memberError) { await admin.from('businesses').delete().eq('id', business.id); throw memberError; }

    const end = new Date(); end.setDate(end.getDate() + 30);
    const endDate = end.toISOString().slice(0, 10);
    const { error: subError } = await admin.from('subscriptions').insert({ business_id: business.id, status: 'trial', plan_id: planId, price_monthly: 0, trial_end: endDate, current_period_end: endDate });
    if (subError) console.error('subscription bootstrap:', subError.message);

    return Response.json({ ok: true, business_id: business.id, slug: business.slug }, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'No se pudo completar el onboarding.' }, { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
