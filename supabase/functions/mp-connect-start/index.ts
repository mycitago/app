// CITAGO · mp-connect-start
import { CORS, getTenantContext, json, randomState, requireEnv, sha256Hex } from "../_shared/mercadopago-common.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  let stage = "start";
  try {
    stage = "tenant_context";
    const c = await getTenantContext(req);

    stage = "oauth_state_create";
    const state = randomState();
    const stateHash = await sha256Hex(state);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: stateError } = await c.admin
      .from("payment_oauth_states")
      .insert({
        state_hash: stateHash,
        business_id: c.business_id,
        user_id: c.user.id,
        provider: "mercadopago",
        expires_at: expiresAt,
      });

    if (stateError) throw new Error(`oauth_state_save_failed: ${stateError.message}`);

    stage = "authorization_url";
    const clientId = requireEnv("MP_CLIENT_ID");
    const redirectUri = requireEnv("MP_REDIRECT_URI");

    const url = new URL("https://auth.mercadopago.com.mx/authorization");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("platform_id", "mp");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);

    return json({ ok: true, url: url.toString() });
  } catch (e) {
    const message = String((e as any)?.message || e);
    console.error("[mp-connect-start:failed]", { stage, message });
    return json({ ok: false, stage, error: message }, /unauthorized|forbidden/.test(message) ? 403 : 400);
  }
});
