// CITAGO · mp-oauth-callback
import { adminClient, appUrl, json, requireEnv, sha256Hex } from "../_shared/mercadopago-common.ts";

function redirectToPayments(params: Record<string, string>) {
  const url = new URL(`${appUrl()}/admin/pagos.html`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return Response.redirect(url.toString(), 302);
}

Deno.serve(async (req) => {
  let stage = "start";
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error");

    if (oauthError) return redirectToPayments({ mp: "error", reason: "authorization_denied" });
    if (!code || !state) return redirectToPayments({ mp: "error", reason: "missing_code_or_state" });

    const admin = adminClient();
    const stateHash = await sha256Hex(state);

    stage = "oauth_state_validate";
    const { data: stateRow, error: stateError } = await admin
      .from("payment_oauth_states")
      .select("state_hash,business_id,user_id,expires_at,used_at")
      .eq("state_hash", stateHash)
      .eq("provider", "mercadopago")
      .maybeSingle();

    if (stateError || !stateRow) return redirectToPayments({ mp: "error", reason: "invalid_state" });
    if (stateRow.used_at) return redirectToPayments({ mp: "error", reason: "state_already_used" });
    if (new Date(stateRow.expires_at).getTime() <= Date.now()) return redirectToPayments({ mp: "error", reason: "state_expired" });

    // Claim the state BEFORE token exchange to enforce single-use.
    const { error: claimError } = await admin
      .from("payment_oauth_states")
      .update({ used_at: new Date().toISOString() })
      .eq("state_hash", stateHash)
      .is("used_at", null);
    if (claimError) return redirectToPayments({ mp: "error", reason: "state_claim_failed" });

    stage = "token_exchange";
    const form = new URLSearchParams();
    form.set("client_id", requireEnv("MP_CLIENT_ID"));
    form.set("client_secret", requireEnv("MP_CLIENT_SECRET"));
    form.set("grant_type", "authorization_code");
    form.set("code", code);
    form.set("redirect_uri", requireEnv("MP_REDIRECT_URI"));
    form.set("state", state);

    const tokenRes = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const tokenText = await tokenRes.text();
    let tokenData: any = {};
    try { tokenData = tokenText ? JSON.parse(tokenText) : {}; } catch { tokenData = { raw: tokenText }; }

    if (!tokenRes.ok || !tokenData?.access_token || !tokenData?.user_id) {
      console.error("[mp-oauth-callback:token-error]", { status: tokenRes.status, error: tokenData?.message || tokenData?.error || tokenData });
      return redirectToPayments({ mp: "error", reason: "token_exchange_failed" });
    }

    const expiresIn = Number(tokenData.expires_in || 0);
    const tokenExpiresAt = expiresIn > 0
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    stage = "secret_save";
    const { error: secretError } = await admin
      .from("business_payment_secrets")
      .upsert({
        business_id: stateRow.business_id,
        provider: "mercadopago",
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_expires_at: tokenExpiresAt,
        provider_user_id: String(tokenData.user_id),
        public_key: tokenData.public_key || null,
        scope: tokenData.scope || null,
        livemode: Boolean(tokenData.live_mode),
        updated_at: new Date().toISOString(),
      }, { onConflict: "business_id,provider" });

    if (secretError) {
      console.error("[mp-oauth-callback:secret-save]", secretError);
      return redirectToPayments({ mp: "error", reason: "credential_save_failed" });
    }

    stage = "status_save";
    const { error: accountError } = await admin
      .from("business_payment_accounts")
      .upsert({
        business_id: stateRow.business_id,
        provider: "mercadopago",
        provider_user_id: String(tokenData.user_id),
        connection_status: "connected",
        onboarding_status: "complete",
        scope: tokenData.scope || null,
        token_expires_at: tokenExpiresAt,
        connected_at: new Date().toISOString(),
        livemode: Boolean(tokenData.live_mode),
        last_error: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "business_id" });

    if (accountError) {
      console.error("[mp-oauth-callback:account-save]", accountError);
      return redirectToPayments({ mp: "error", reason: "connection_save_failed" });
    }

    console.log("[mp-oauth-callback:ok]", { business_id: stateRow.business_id, provider_user_id: String(tokenData.user_id) });
    return redirectToPayments({ mp: "return" });
  } catch (e) {
    console.error("[mp-oauth-callback:failed]", { stage, message: String((e as any)?.message || e) });
    return redirectToPayments({ mp: "error", reason: "unexpected" });
  }
});
