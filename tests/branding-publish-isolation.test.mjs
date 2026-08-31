import assert from 'node:assert/strict';
import fs from 'node:fs';
const sql=fs.readFileSync('sql/branding_schema.sql','utf8');
assert.ok(sql.includes("published_config->>'primary_color'"),'public view must source primary color from published_config');
assert.ok(sql.includes("published_config->>'cover_url'"),'public view must source cover from published_config');
const js=fs.readFileSync('js/admin-branding.js','utf8');
assert.ok(js.includes('brandingRow?.draft_config?.logo_url'),'draft save must preserve existing logo');
assert.ok(js.includes('brandingRow?.draft_config?.cover_url'),'draft save must preserve existing cover');
console.log('branding publish isolation OK');
