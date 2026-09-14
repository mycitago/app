
const assert = require('assert');
const {
  sanitizePromoCode,
  calculatePromotion,
  buildPromotionUrl,
  filterCustomersForCampaign,
  validatePromotionInput,
  summarizeSources
} = require('../js/growth-promotion-utils.js');

assert.equal(sanitizePromoCode(' verano 20 !! '), 'VERANO20');
assert.equal(sanitizePromoCode('VIP_cliente-01'), 'VIP_CLIENTE-01');

assert.deepEqual(
  calculatePromotion({price: 1000, type: 'percent', value: 20}),
  {original:1000, discount:200, final:800}
);
assert.deepEqual(
  calculatePromotion({price: 350, type: 'fixed', value: 500}),
  {original:350, discount:350, final:0}
);

assert.equal(
  buildPromotionUrl({
    origin:'https://mycitago.github.io',
    appPath:'/app',
    slug:'clinica',
    source:'whatsapp',
    promoCode:'VERANO20'
  }),
  'https://mycitago.github.io/app/reservar.html?n=clinica&src=whatsapp&promo=VERANO20'
);

const customers = [
  {name:'A', marketing_opt_in:true, segment:'frecuente', completed_visits:5, cancelled_visits:0, last_visit:'2026-09-01'},
  {name:'B', marketing_opt_in:false, segment:'frecuente', completed_visits:7, cancelled_visits:0, last_visit:'2026-09-02'},
  {name:'C', marketing_opt_in:true, segment:'nuevo', completed_visits:1, cancelled_visits:2, last_visit:'2026-05-01'}
];

assert.deepEqual(
  filterCustomersForCampaign(customers,{segment:'frecuente'}).map(x=>x.name),
  ['A']
);
assert.deepEqual(
  filterCustomersForCampaign(customers,{segment:'all'}).map(x=>x.name),
  ['A','C']
);

assert.deepEqual(
  validatePromotionInput({serviceId:'s1', code:'VERANO20', type:'percent', value:20, servicePrice:1000}),
  {ok:true}
);
assert.equal(
  validatePromotionInput({serviceId:'s1', code:'X', type:'percent', value:120, servicePrice:1000}).ok,
  false
);

assert.deepEqual(
  summarizeSources([{booking_source:'whatsapp'},{booking_source:'whatsapp'},{booking_source:'email'}]),
  {total:3, topSource:'whatsapp', counts:{whatsapp:2,email:1}}
);

console.log('growth-promotion-utils tests: PASS');
