# D3 Canonical Service Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `public.service_templates` the single functional source of service templates for both Onboarding and Services, using a tenant-safe authenticated RPC without changing shell/navigation, plan limits, payments, Reviews, Growth, or Google Business.

**Architecture:** Add one `SECURITY DEFINER` RPC, `public.get_business_service_templates(p_business_id uuid)`, that authorizes the caller against the requested business and derives the business category server-side before returning active templates. Migrate `js/admin-onboarding.js` and `js/admin-services.js` to consume that RPC, preserve all existing `services` rows unchanged, and remove the hardcoded `SERVICE_TEMPLATE_LIBRARY` only after tests prove no functional path depends on it.

**Tech Stack:** PostgreSQL / Supabase RPC + RLS-compatible authorization, Supabase JS v2, vanilla JavaScript, Node.js repository tests.

**Spec:** `docs/superpowers/specs/2026-09-14-d3-catalogo-canonico-design.md`

## Global Constraints

- D3 implements only R2: catalog duplication / non-canonical templates.
- Do not modify R5/F3 shell, sidebar, navigation, or full visual consolidation.
- Do not add or modify D4 plan limits; do not invent `max_services`.
- Do not touch D2 / Mercado Pago or any payment flow.
- Do not touch Reviews, Growth, or Google Business Profile.
- Do not change the current global `service_templates_read` policy in D3.
- `anon` must not be able to execute `get_business_service_templates(uuid)`.
- The RPC must derive the category from `businesses.business_category_id`; the frontend must not supply a category as an authorization input.
- Existing `services` rows must not be migrated, rewritten, or deleted as part of deployment.
- Mid-onboarding businesses must continue from their current persisted state.
- Do not keep the hardcoded template library as a silent runtime fallback after the canonical path is verified.
- Use TDD: every behavior-changing task starts with a failing test and verifies RED before implementation.

---

## File Map

**Create**
- `supabase/migrations/20260914_d3_service_templates_rpc.sql` — tenant-safe RPC and explicit function grants.
- `tests/d3-service-templates-rpc.sql` — SQL contract checks for auth/membership/category/active-only behavior.
- `tests/d3-onboarding-canonical-templates.test.mjs` — static/behavioral contract for Onboarding using the RPC and preserving deduplication.
- `tests/d3-services-canonical-templates.test.mjs` — contract for Services using the RPC and no functional dependency on `SERVICE_TEMPLATE_LIBRARY`.
- `tests/d3-scope-regression.test.mjs` — guardrails proving D3 did not alter excluded areas.

**Modify**
- `js/admin-onboarding.js` — replace direct `service_templates` query with `get_business_service_templates`.
- `js/admin-services.js` — load templates through the RPC, derive categories/templates from returned rows, and retire the hardcoded runtime library.
- `admin/servicios.html` — only if required to wire a small loading/error state for the canonical template source; do not alter shell/sidebar/navigation.
- `docs/superpowers/specs/2026-09-14-d3-catalogo-canonico-design.md` — no functional edits expected; keep as design source.
- `docs/superpowers/plans/2026-09-14-d3-catalogo-canonico.md` — this implementation plan.

---

### Task 1: Add the tenant-safe service-template RPC

**Files:**
- Create: `supabase/migrations/20260914_d3_service_templates_rpc.sql`
- Create: `tests/d3-service-templates-rpc.sql`

**Interfaces:**
- Consumes: `auth.uid()`, `public.is_member_of(uuid)`, `public.is_platform_admin()`, `public.businesses.business_category_id`, `public.service_templates`.
- Produces: `public.get_business_service_templates(p_business_id uuid)` returning template rows with `id`, `business_category_id`, `name`, `category`, `description`, `duration_minutes`, `suggested_price`, `image_url`, `tags`, `sort_order`, `active`.

- [ ] **Step 1: Write the failing SQL contract test**

Create `tests/d3-service-templates-rpc.sql` with checks that fail before the migration exists:

```sql
begin;

-- Function must exist.
do $$
begin
  if to_regprocedure('public.get_business_service_templates(uuid)') is null then
    raise exception 'D3 RPC missing';
  end if;
end $$;

-- It must be SECURITY DEFINER.
do $$
declare
  v_prosecdef boolean;
begin
  select p.prosecdef
    into v_prosecdef
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'get_business_service_templates'
    and pg_get_function_identity_arguments(p.oid) = 'p_business_id uuid';

  if coalesce(v_prosecdef, false) is not true then
    raise exception 'D3 RPC must be SECURITY DEFINER';
  end if;
end $$;

-- anon must not have EXECUTE.
do $$
begin
  if has_function_privilege(
    'anon',
    'public.get_business_service_templates(uuid)',
    'EXECUTE'
  ) then
    raise exception 'anon must not execute D3 RPC';
  end if;
end $$;

-- authenticated must have EXECUTE.
do $$
begin
  if not has_function_privilege(
    'authenticated',
    'public.get_business_service_templates(uuid)',
    'EXECUTE'
  ) then
    raise exception 'authenticated must execute D3 RPC';
  end if;
end $$;

rollback;
```

- [ ] **Step 2: Run the SQL contract test and verify RED**

Run against the development/test database:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/d3-service-templates-rpc.sql
```

Expected: FAIL with `D3 RPC missing`.

- [ ] **Step 3: Write the minimal migration**

Create `supabase/migrations/20260914_d3_service_templates_rpc.sql`:

```sql
create or replace function public.get_business_service_templates(
  p_business_id uuid
)
returns table (
  id uuid,
  business_category_id text,
  name text,
  category text,
  description text,
  duration_minutes integer,
  suggested_price numeric,
  image_url text,
  tags jsonb,
  sort_order integer,
  active boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_category text;
begin
  if v_uid is null then
    raise exception 'unauthenticated'
      using errcode = '42501';
  end if;

  if not (
    public.is_member_of(p_business_id)
    or public.is_platform_admin()
  ) then
    raise exception 'forbidden'
      using errcode = '42501';
  end if;

  select b.business_category_id
    into v_category
  from public.businesses b
  where b.id = p_business_id;

  if v_category is null then
    return;
  end if;

  return query
  select
    st.id,
    st.business_category_id,
    st.name,
    st.category,
    st.description,
    st.duration_minutes,
    st.suggested_price,
    st.image_url,
    st.tags,
    st.sort_order,
    st.active
  from public.service_templates st
  where st.business_category_id = v_category
    and st.active = true
  order by st.sort_order, st.name;
end;
$$;

revoke all on function public.get_business_service_templates(uuid) from public;
revoke all on function public.get_business_service_templates(uuid) from anon;
grant execute on function public.get_business_service_templates(uuid) to authenticated;
```

- [ ] **Step 4: Extend the SQL test with behavior checks**

Add test fixtures inside a transaction using two businesses with different categories and two authenticated test users. Use `set local request.jwt.claim.sub = '<uuid>'` or the repository’s established auth-test helper so that `auth.uid()` resolves per test session. Verify:

```sql
-- Member of business A gets only A-category active templates.
select count(*) = 0
from public.get_business_service_templates(:business_a)
where business_category_id <> :category_a;

-- Inactive rows never appear.
select count(*) = 0
from public.get_business_service_templates(:business_a)
where active is not true;

-- Same authenticated user cannot read business B without membership.
-- Expected SQLSTATE 42501 / message 'forbidden'.
```

Use fixture inserts only inside `begin ... rollback` so production rows are not changed.

- [ ] **Step 5: Apply the migration in the test environment and verify GREEN**

Run:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260914_d3_service_templates_rpc.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/d3-service-templates-rpc.sql
```

Expected: PASS with no exception.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260914_d3_service_templates_rpc.sql tests/d3-service-templates-rpc.sql
git commit -m "feat: add tenant-safe service template rpc"
```

---

### Task 2: Migrate Onboarding to the canonical RPC

**Files:**
- Modify: `js/admin-onboarding.js`
- Create: `tests/d3-onboarding-canonical-templates.test.mjs`

**Interfaces:**
- Consumes: `supabaseClient.rpc('get_business_service_templates', { p_business_id })`.
- Produces: `loadTemplates()` that loads canonical templates for `onboardingBiz.id`, preserves existing-service matching, and no longer selects `service_templates` directly.

- [ ] **Step 1: Write the failing Onboarding contract test**

Create `tests/d3-onboarding-canonical-templates.test.mjs`:

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';

const src = fs.readFileSync('js/admin-onboarding.js', 'utf8');

assert.match(
  src,
  /\.rpc\(\s*['"]get_business_service_templates['"]/,
  'Onboarding must load templates through canonical RPC'
);

assert.doesNotMatch(
  src,
  /\.from\(\s*['"]service_templates['"]\s*\)/,
  'Onboarding must not read service_templates directly'
);

assert.match(
  src,
  /normalizeName/,
  'Existing service deduplication must remain'
);

assert.match(
  src,
  /onboardingExistingServices/,
  'Existing services must still participate in matching'
);

console.log('d3 onboarding canonical templates: PASS');
```

- [ ] **Step 2: Run it and verify RED**

Run:

```bash
node tests/d3-onboarding-canonical-templates.test.mjs
```

Expected: FAIL because `admin-onboarding.js` still queries `service_templates` directly.

- [ ] **Step 3: Replace the direct template query**

In `js/admin-onboarding.js`, replace the direct category query inside `loadTemplates` with:

```js
async function loadTemplates(){
  if(!onboardingBiz?.id){
    onboardingTemplates=[];
    selectedTemplateIds=new Set();
    return;
  }

  const {data,error}=await supabaseClient.rpc(
    'get_business_service_templates',
    {p_business_id:onboardingBiz.id}
  );

  if(error){
    console.error('[Onboarding] No se pudieron cargar plantillas canónicas:', error);
    onboardingTemplates=[];
    selectedTemplateIds=new Set();
    obToast('No se pudieron cargar las recomendaciones de servicios. Intenta de nuevo.','error');
    return;
  }

  onboardingTemplates=data||[];

  if(!onboardingTemplates.length){
    selectedTemplateIds=new Set();
    return;
  }

  const existingNames=new Set(
    onboardingExistingServices.map(s=>normalizeName(s.name))
  );

  const preselected=onboardingTemplates
    .filter(t=>existingNames.has(normalizeName(t.name)))
    .map(t=>t.id);

  selectedTemplateIds=new Set(
    preselected.length
      ? preselected
      : onboardingTemplates
          .slice(0,Math.min(4,onboardingTemplates.length))
          .map(x=>x.id)
  );
}
```

Do not retain the old synthetic `id:'custom'` fallback as a second source of truth. If a category has no templates, present an empty controlled state and let the user continue to Services later rather than inventing a runtime catalog row.

- [ ] **Step 4: Update callers to the new signature**

Change calls such as:

```js
await loadTemplates(onboardingCategory);
```

to:

```js
await loadTemplates();
```

The RPC derives category from `onboardingBiz.id`; the frontend category value is no longer an authorization input.

- [ ] **Step 5: Add the empty-state rendering**

In `renderTemplates()` and/or the Step 3 container, if `onboardingTemplates.length === 0`, render an informational card:

```js
const empty=document.createElement('div');
empty.className='onboarding-empty';
empty.textContent='Aún no hay plantillas recomendadas para este giro. Puedes continuar y crear tus servicios después desde Servicios.';
root.replaceChildren(empty);
```

Keep the existing “select at least one service” validation only when templates exist. If no canonical templates exist, allow the user to continue without inserting a fake service.

- [ ] **Step 6: Run the Onboarding test and syntax check**

Run:

```bash
node tests/d3-onboarding-canonical-templates.test.mjs
node --check js/admin-onboarding.js
```

Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add js/admin-onboarding.js tests/d3-onboarding-canonical-templates.test.mjs
git commit -m "refactor: use canonical templates in onboarding"
```

---

### Task 3: Migrate Services to canonical templates

**Files:**
- Modify: `js/admin-services.js`
- Create: `tests/d3-services-canonical-templates.test.mjs`

**Interfaces:**
- Consumes: same RPC as Task 2.
- Produces:
  - `canonicalServiceTemplates` array loaded from Supabase.
  - `loadCanonicalServiceTemplates()` function.
  - template rendering and selection based only on canonical rows.
  - no runtime dependency on `SERVICE_TEMPLATE_LIBRARY`.

- [ ] **Step 1: Write the failing Services contract test**

Create `tests/d3-services-canonical-templates.test.mjs`:

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';

const src = fs.readFileSync('js/admin-services.js', 'utf8');

assert.match(
  src,
  /\.rpc\(\s*['"]get_business_service_templates['"]/,
  'Services must load templates through canonical RPC'
);

assert.doesNotMatch(
  src,
  /const\s+SERVICE_TEMPLATE_LIBRARY\s*=/,
  'Hardcoded template library must no longer be a runtime source'
);

assert.match(
  src,
  /canonicalServiceTemplates/,
  'Services must keep canonical template state'
);

assert.match(
  src,
  /business_category_locked/,
  'Business category lock behavior must remain'
);

console.log('d3 services canonical templates: PASS');
```

- [ ] **Step 2: Run it and verify RED**

Run:

```bash
node tests/d3-services-canonical-templates.test.mjs
```

Expected: FAIL because the hardcoded library still exists and no RPC is used.

- [ ] **Step 3: Add canonical template state and loader**

Near the current top-level state in `js/admin-services.js`, add:

```js
let canonicalServiceTemplates=[];

async function loadCanonicalServiceTemplates(){
  if(!biz?.id){
    canonicalServiceTemplates=[];
    return [];
  }

  const {data,error}=await supabaseClient.rpc(
    'get_business_service_templates',
    {p_business_id:biz.id}
  );

  if(error){
    console.error('[services] No se pudieron cargar plantillas canónicas:',error);
    canonicalServiceTemplates=[];
    toast('No se pudieron cargar las plantillas de tu giro.');
    return [];
  }

  canonicalServiceTemplates=(data||[]).map(row=>({
    id:row.id,
    name:row.name,
    category:row.category||'Servicios',
    description:row.description||'',
    duration:Number(row.duration_minutes||60),
    suggestedPrice:row.suggested_price==null
      ? 0
      : Number(row.suggested_price),
    imageUrl:row.image_url||'',
    tags:Array.isArray(row.tags)?row.tags:[]
  }));

  return canonicalServiceTemplates;
}
```

- [ ] **Step 4: Replace category/template helpers**

Replace helpers that read `SERVICE_TEMPLATE_LIBRARY` with canonical-data versions:

```js
function currentBusinessCategoryKey(){
  return String(biz?.business_category_id||'').trim();
}

function allowedServiceCategories(){
  const values=canonicalServiceTemplates
    .map(t=>String(t.category||'').trim())
    .filter(Boolean);
  return [...new Set(values)];
}

function isAllowedServiceCategory(category){
  const value=String(category||'').trim().toLocaleLowerCase('es-MX');
  return allowedServiceCategories().some(
    item=>item.toLocaleLowerCase('es-MX')===value
  );
}

function templateBelongsToBusiness(template){
  return canonicalServiceTemplates.some(
    item=>String(item.id)===String(template?.id)
  );
}
```

Do not use a hardcoded category map as a replacement source of truth.

- [ ] **Step 5: Replace template rendering**

Update `renderServiceTemplates()` so its list comes from:

```js
const list=canonicalServiceTemplates;
```

Use canonical fields:

```js
img.src =
  platformAssetForTemplate(t)
  || t.imageUrl
  || assetUrl('consulting.svg');

small.textContent =
  `${t.duration} min · ${suggestedPriceForTemplate(t)
    ? money(suggestedPriceForTemplate(t))+' sugerido'
    : 'precio por definir'}`;
```

If `list.length===0`, render a controlled empty state rather than falling back to `other`.

- [ ] **Step 6: Update template asset keys**

Because the canonical RPC no longer depends on the old category key map, make asset lookup stable using the real business category plus canonical template name:

```js
function templateAssetKey(t){
  const category=currentBusinessCategoryKey()||'other';
  const slug=String(t.name||'')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-|-$/g,'');
  return `${category}:${slug}`;
}
```

- [ ] **Step 7: Load canonical templates during Services initialization**

In the existing initialization sequence, after `biz` has been resolved and before `renderServiceTemplates()`, call:

```js
await loadCanonicalServiceTemplates();
renderServiceTemplates();
```

Do not call the RPC before `biz.id` exists.

- [ ] **Step 8: Retire the hardcoded library**

Remove:

```js
const SERVICE_TEMPLATE_LIBRARY = { ... };
const SERVICE_CATEGORY_RULES = { ... };
```

Remove or rewrite any helper that only exists to query those objects.

Keep `BUSINESS_CATEGORY_LABELS` only if it remains purely presentational for the locked-giro label; it must not act as the template source.

- [ ] **Step 9: Verify the simplified flow still preserves advanced fields**

Ensure `applyServiceTemplate(t)` fills only the quick-start defaults:

```js
$('sname').value=t.name||'';
$('category').value=t.category||'Servicios';
$('duration').value=t.duration||60;
$('price').value=suggestedPriceForTemplate(t)||'';
$('sdesc').value=t.description||'';
```

Do not clear or remove staff, buffer, deposit, images, internal cost, taxes, scheduling, or visibility controls.

- [ ] **Step 10: Run tests and syntax checks**

Run:

```bash
node tests/d3-services-canonical-templates.test.mjs
node --check js/admin-services.js
```

Expected: both PASS.

- [ ] **Step 11: Commit**

```bash
git add js/admin-services.js tests/d3-services-canonical-templates.test.mjs
git commit -m "refactor: use canonical templates in services"
```

---

### Task 4: Preserve mid-onboarding and existing-service compatibility

**Files:**
- Modify: `tests/d3-onboarding-canonical-templates.test.mjs`
- Modify: `tests/d3-services-canonical-templates.test.mjs`

**Interfaces:**
- Consumes: existing `normalizeName`, `onboardingExistingServices`, persisted `business_category_id`, independent `services` rows.
- Produces: regression tests proving no forced service migration and no category reset.

- [ ] **Step 1: Add failing compatibility assertions**

Extend `tests/d3-onboarding-canonical-templates.test.mjs`:

```js
assert.match(
  src,
  /business_category_locked/,
  'Existing locked category behavior must remain'
);

assert.match(
  src,
  /existingNames/,
  'Existing service names must still be compared'
);

assert.match(
  src,
  /\.update\(payload\)/,
  'Existing matching services must still be updated instead of duplicated'
);
```

Extend `tests/d3-services-canonical-templates.test.mjs`:

```js
assert.doesNotMatch(
  src,
  /\.delete\(\).*services/s,
  'D3 must not introduce service deletion during catalog switch'
);
```

- [ ] **Step 2: Run the compatibility tests**

Run:

```bash
node tests/d3-onboarding-canonical-templates.test.mjs
node tests/d3-services-canonical-templates.test.mjs
```

Expected: any regression introduced in Tasks 2–3 fails here.

- [ ] **Step 3: Fix only compatibility regressions**

If any assertion fails because a required compatibility path was accidentally removed, restore the existing behavior without introducing a migration.

No data migration should be added.

- [ ] **Step 4: Re-run tests**

Run the same two commands.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/d3-onboarding-canonical-templates.test.mjs tests/d3-services-canonical-templates.test.mjs js/admin-onboarding.js js/admin-services.js
git commit -m "test: protect d3 catalog compatibility"
```

---

### Task 5: Add scope guardrails for R5, D4, D2, Reviews, Growth, and Google

**Files:**
- Create: `tests/d3-scope-regression.test.mjs`

**Interfaces:**
- Consumes: Git diff against the pre-D3 baseline.
- Produces: explicit allowed-file guard.

- [ ] **Step 1: Write the scope regression test**

Create `tests/d3-scope-regression.test.mjs`:

```js
import {execSync} from 'node:child_process';
import assert from 'node:assert/strict';

const base=process.env.D3_BASE_REF||'HEAD~4';
const changed=execSync(
  `git diff --name-only ${base}...HEAD`,
  {encoding:'utf8'}
)
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);

const allowed=[
  'js/admin-onboarding.js',
  'js/admin-services.js',
  'admin/servicios.html',
  'supabase/migrations/20260914_d3_service_templates_rpc.sql',
  'tests/d3-service-templates-rpc.sql',
  'tests/d3-onboarding-canonical-templates.test.mjs',
  'tests/d3-services-canonical-templates.test.mjs',
  'tests/d3-scope-regression.test.mjs',
  'docs/superpowers/specs/2026-09-14-d3-catalogo-canonico-design.md',
  'docs/superpowers/plans/2026-09-14-d3-catalogo-canonico.md'
];

const unexpected=changed.filter(path=>!allowed.includes(path));
assert.deepEqual(
  unexpected,
  [],
  `D3 touched out-of-scope files: ${unexpected.join(', ')}`
);

console.log('d3 scope regression: PASS');
```

- [ ] **Step 2: Run it with the correct baseline ref**

Before implementation, record the baseline commit:

```bash
git rev-parse HEAD
```

Then run:

```bash
D3_BASE_REF=<baseline-sha> node tests/d3-scope-regression.test.mjs
```

Expected: PASS if only D3 files changed.

- [ ] **Step 3: Remove any accidental out-of-scope edits**

If the test reports files related to shell/navigation, plans/entitlements, Mercado Pago, Reviews, Growth, or Google Business, revert those changes from D3.

- [ ] **Step 4: Re-run scope guard**

```bash
D3_BASE_REF=<baseline-sha> node tests/d3-scope-regression.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/d3-scope-regression.test.mjs
git commit -m "test: enforce d3 scope boundaries"
```

---

### Task 6: Full verification before completion

**Files:**
- No new production files.
- Validate all files changed by Tasks 1–5.

**Interfaces:**
- Consumes: entire D3 implementation.
- Produces: evidence that D3 is complete without collateral changes.

- [ ] **Step 1: Run JavaScript syntax checks**

```bash
node --check js/admin-onboarding.js
node --check js/admin-services.js
```

Expected: both exit 0.

- [ ] **Step 2: Run D3 JavaScript tests**

```bash
node tests/d3-onboarding-canonical-templates.test.mjs
node tests/d3-services-canonical-templates.test.mjs
D3_BASE_REF=<baseline-sha> node tests/d3-scope-regression.test.mjs
```

Expected: all PASS.

- [ ] **Step 3: Run the SQL contract test**

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/d3-service-templates-rpc.sql
```

Expected: PASS.

- [ ] **Step 4: Perform authenticated tenant-isolation verification**

Using two real or isolated test users/businesses:

1. Authenticate as a member of Business A.
2. Call:

```js
await supabase.rpc('get_business_service_templates',{
  p_business_id: BUSINESS_A_ID
});
```

Expected: only active templates from Business A's category.

3. With the same session call the RPC for Business B where the user is not a member.

Expected: error with `forbidden` / SQLSTATE `42501`.

4. Call the RPC with an anon client.

Expected: permission denied because `anon` has no `EXECUTE`.

- [ ] **Step 5: Verify Onboarding in browser**

For a business with persisted category and incomplete setup:

1. Open `admin/onboarding.html`.
2. Confirm previously saved name/category/hours remain.
3. Open Step 3.
4. Confirm templates correspond to the persisted business category.
5. Confirm an existing service with the same normalized name appears as existing and does not duplicate on save.
6. Finish the flow and confirm no unrelated data was reset.

- [ ] **Step 6: Verify Services in browser**

1. Open `admin/servicios.html`.
2. Confirm existing services still render.
3. Confirm quick-start templates correspond to the business category.
4. Pick a template.
5. Confirm name/category/duration/price suggestion populate.
6. Save the service.
7. Confirm staff, buffer, deposit, image, advanced settings, and active/featured controls still exist.
8. Confirm sidebar/shell/navigation look exactly as before D3.

- [ ] **Step 7: Verify database non-migration guarantee**

Run a before/after count and checksum-style snapshot for existing `services` rows around deployment:

```sql
select
  business_id,
  count(*) as service_count,
  sum(coalesce(price,0)) as price_sum
from public.services
group by business_id
order by business_id;
```

Expected: applying the D3 migration alone changes no `services` row counts or prices.

- [ ] **Step 8: Record the deferred RLS follow-up**

Add a project note/issue titled:

```text
Post-D3 security: close direct service_templates read policy
```

with acceptance criteria:

```text
- inventory every direct consumer of public.service_templates
- migrate remaining consumers to safe interfaces
- restrict or remove service_templates_read for anon/authenticated
- verify public/admin regressions before closing
```

This is documentation only; do not change the RLS policy in D3.

- [ ] **Step 9: Final verification commit**

```bash
git add .
git status --short
git commit -m "chore: verify d3 canonical service catalog"
```

Only commit if `git status` shows no accidental generated/binary/out-of-scope files.

---

## Completion Evidence Required

Do not claim D3 complete until all of the following are captured from fresh runs:

```text
[ ] SQL RPC contract PASS
[ ] anon EXECUTE denied
[ ] authenticated non-member denied
[ ] authenticated member receives only active templates for own business category
[ ] admin-onboarding.js syntax PASS
[ ] admin-services.js syntax PASS
[ ] onboarding canonical-template test PASS
[ ] services canonical-template test PASS
[ ] scope regression test PASS
[ ] existing services unchanged by migration
[ ] mid-onboarding business continues successfully
[ ] Services quick-start works from canonical RPC
[ ] no R5/D4/D2/Reviews/Growth/Google files changed
```
