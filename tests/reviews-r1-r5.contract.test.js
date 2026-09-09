
const fs = require('fs');
const path = require('path');
const root = process.argv[2];
let failed = false;
function read(p){ return fs.existsSync(path.join(root,p)) ? fs.readFileSync(path.join(root,p),'utf8') : ''; }
function expect(ok,msg){ if(!ok){ console.error('FAIL:',msg); failed=true; } }

const sql=read('sql/R1_R5_VERIFIED_REVIEWS.sql');
const reviewJs=read('js/public-review.js');
const publicJs=read('js/public-reviews-verified.js');
const adminJs=read('js/admin-reviews.js');
const reviewHtml=read('resena.html');
const bookingHtml=read('reservar.html');
const adminHtml=read('admin/resenas.html');

expect(sql.includes('verified boolean'), 'R1: falta reviews.verified');
expect(sql.includes('appointment_not_completed'), 'R1: falta revalidación de cita completada');
expect(sql.includes('review_already_submitted'), 'R1: falta bloqueo de reseña duplicada');
expect(sql.includes("length(trim(coalesce(p_comment"), 'R1: falta límite de comentario');
expect(sql.includes('public_business_reviews_verified'), 'R3: falta RPC pública segura');
expect(sql.includes("source = 'internal' and r.verified = true"), 'R3: reseñas MyCitaGo públicas deben ser verificadas');
expect(reviewJs.includes("get_review_request_public"), 'R2: formulario no valida token');
expect(reviewJs.includes("submit_internal_review"), 'R2: formulario no usa RPC segura');
expect(reviewHtml.includes('Cliente verificado'), 'R2: falta señal de reseña verificada');
expect(publicJs.includes('public_business_reviews_verified'), 'R3: booking no usa RPC de reputación');
expect(publicJs.includes('Cliente verificado'), 'R3: falta badge verificado');
expect(bookingHtml.includes('public-reviews-verified.js'), 'R3: reservar.html no carga el módulo');
expect(adminJs.includes('verified'), 'R4: admin no carga campo verified');
expect(adminJs.includes('Cliente verificado'), 'R4: admin no distingue reseña verificada');
expect(adminHtml.includes('verified'), 'R4: falta filtro/verificación visual en admin');
process.exit(failed?1:0);
