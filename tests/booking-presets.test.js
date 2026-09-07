const assert = require('assert');
const { resolveBookingPreset, BOOKING_PRESETS } = require('../js/booking-category-presets.js');
assert.equal(resolveBookingPreset('dental').key, 'dental');
assert.equal(resolveBookingPreset('dentista').key, 'dental');
assert.equal(resolveBookingPreset('barberia').key, 'barber');
assert.equal(resolveBookingPreset('salon_belleza').key, 'beauty');
assert.equal(resolveBookingPreset('veterinaria').key, 'veterinary');
assert.equal(resolveBookingPreset('psicologia').key, 'psychology');
assert.equal(resolveBookingPreset('spa').key, 'spa');
assert.equal(resolveBookingPreset('algo_desconocido').key, 'generic');
assert.equal(BOOKING_PRESETS.dental.serviceQuestion, '¿Qué tratamiento necesitas?');
assert.match(BOOKING_PRESETS.veterinary.serviceQuestion, /mascota/i);
for (const preset of Object.values(BOOKING_PRESETS)) {
  assert.ok(preset.serviceQuestion);
  assert.ok(preset.serviceSubtitle);
  assert.ok(preset.searchPlaceholder);
  assert.ok(preset.themeClass);
}
console.log('PASS booking presets');
