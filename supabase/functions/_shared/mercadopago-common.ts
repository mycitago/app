import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

export function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function requireEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} missing`);
  return value;
}

export async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomState() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function getTenantContext(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) throw new Error("unauthorized");

  const userClient = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_ANON_KEY"),
    { global: { headers: { Authorization: auth } } },
  );

  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) throw new Error("unauthorized");

  const body = await req.json().catch(() => ({}));
  const business_id = body?.business_id;
  if (!business_id) throw new Error("business_id required");

  const admin = adminClient();
  const { data: member, error: memberError } = await admin
    .from("business_members")
    .select("role,status")
    .eq("business_id", business_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (memberError) throw new Error(`membership_lookup_failed: ${memberError.message}`);
  if (!member) throw new Error("forbidden");

  const role = String(member.role || "").toUpperCase();
  if (!["OWNER", "MANAGER", "ADMIN"].includes(role)) throw new Error("forbidden");

  return { user, business_id, admin };
}

export function appUrl() {
  return (Deno.env.get("APP_PUBLIC_URL") || "https://mycitago.github.io/app")
    .trim()
    .replace(/^['\"]|['\"]$/g, "")
    .replace(/\/+$/, "");
}
