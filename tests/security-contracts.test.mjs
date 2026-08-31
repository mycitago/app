import assert from 'node:assert/strict';
import fs from 'node:fs';
const sql=fs.readFileSync('sql/google_reviews_schema.sql','utf8');
assert.ok(sql.includes('business_google_tokens'),'missing server-only token table');
assert.ok(sql.includes('alter table public.business_google_tokens enable row level security'),'token table must have RLS');
assert.ok(sql.includes('revoke all on public.business_google_tokens from anon, authenticated'),'token table must be browser-inaccessible');
const helper=fs.readFileSync('supabase/functions/_shared/google.ts','utf8');
assert.ok(helper.includes('GOOGLE_STATE_SECRET'),'OAuth state HMAC secret missing');
assert.ok(helper.includes('signState') && helper.includes('verifyState'),'state signing helpers missing');
const start=fs.readFileSync('supabase/functions/google-oauth-start/index.ts','utf8');
const cb=fs.readFileSync('supabase/functions/google-oauth-callback/index.ts','utf8');
assert.ok(start.includes('signState'),'OAuth start must sign state');
assert.ok(cb.includes('verifyState'),'callback must verify signed state');
for(const name of ['google-business-locations','google-reviews-sync','google-review-reply','google-review-delete-reply']){
 const s=fs.readFileSync(`supabase/functions/${name}/index.ts`,'utf8');
 assert.ok(s.includes('getAccessToken'),`${name} must use server-side token helper`);
 assert.ok(!s.includes('business_integrations'),`${name} must not use browser-visible integration config for secrets`);
}
assert.ok(!fs.readFileSync('sql/branding_schema.sql','utf8').includes('security_invoker=true'),'public branding view must not depend on anon base-table RLS');
console.log('security contracts OK');
