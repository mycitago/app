import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(p){ return fs.readFileSync(p,'utf8'); }
function must(p,tokens){ assert.ok(fs.existsSync(p),`missing ${p}`); const s=read(p); for(const t of tokens) assert.ok(s.includes(t),`${p} missing ${t}`); }

must('js/citago-shell.js',['CitagoShell','mount','activePage','mi-pagina','resenas']);
must('css/citago-admin.css',['.ct-card','.ct-btn','.ct-stat-grid','.ct-form-field','.ct-data-table','.ct-badge']);
must('js/admin-customers.js',['renderCustomers','filterCustomers','openCustomerDetail','lifetime_value','next_visit']);
must('js/admin-services.js',['renderServiceCatalog','openServiceEditor','saveServiceEditor','image_url']);
must('sql/branding_schema.sql',['business_branding','draft_config','published_config','publish_business_branding','enable row level security']);
must('js/admin-branding.js',['loadBranding','saveBrandingDraft','publishBranding','renderBrandPreview']);
must('admin/mi-pagina.html',['branding-form','brand-preview','publish-branding']);
must('js/public-branding.js',['loadPublishedBranding','applyPublishedBranding','renderPublicSections']);
must('sql/google_reviews_schema.sql',['business_google_connections','business_google_reviews','enable row level security']);
for(const f of ['google-oauth-start','google-oauth-callback','google-business-locations','google-reviews-sync','google-review-reply','google-review-delete-reply','google-disconnect']){
  must(`supabase/functions/${f}/index.ts`,['business_id']);
}
must('admin/resenas.html',['google-connect','reviews-list']);
must('js/admin-reviews.js',['connectGoogle','syncReviews','replyReview']);
must('js/admin-platform.js',['renderPlatformDashboard','renderBusinessTable','openBusinessDrawer']);
must('css/admin-platform.css',['.platform-grid']);

for(const page of ['index.html','clientes.html','servicios.html','equipo.html','contabilidad.html','configuracion.html','integraciones.html','planes.html','mi-pagina.html','resenas.html']){
 const p='admin/'+page; assert.ok(fs.existsSync(p),`missing ${p}`); const s=read(p); assert.ok(s.includes('citago-admin.css'),`${p} no shared css`); assert.ok(s.includes('citago-shell.js'),`${p} no shell`);
}
console.log('all CITAGO contracts OK');
