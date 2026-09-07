
const assert = require('assert');
const {
  getPunctualityState,
  summarizeTodayPunctuality,
  formatBusinessTime
} = require('../js/dashboard-punctuality.js');

const tz='America/Mexico_City';

function appt(start,end,status='confirmada',date='2026-09-07'){
  return {appointment_date:date,start_time:start,end_time:end,status,branch_id:'main'};
}

// Exact cases using an injected business-local "now"
let now={dateKey:'2026-09-07',minutes:9*60};
assert.equal(getPunctualityState(appt('10:00','10:30'),now).key,'upcoming');

now={dateKey:'2026-09-07',minutes:9*60+45};
assert.equal(getPunctualityState(appt('10:00','10:30'),now).key,'starting');

now={dateKey:'2026-09-07',minutes:9*60+44};
assert.equal(getPunctualityState(appt('10:00','10:30'),now).key,'upcoming');

now={dateKey:'2026-09-07',minutes:10*60+10};
assert.equal(getPunctualityState(appt('10:00','10:30'),now).key,'in_progress');

now={dateKey:'2026-09-07',minutes:10*60+31};
assert.equal(getPunctualityState(appt('10:00','10:30'),now).key,'late');

now={dateKey:'2026-09-07',minutes:12*60};
assert.equal(getPunctualityState(appt('10:00','10:30','completada'),now).key,'completed');

// "en_curso" real saved status wins while not completed
assert.equal(getPunctualityState(appt('10:00','10:30','en_curso'),now).key,'in_progress');

// Future day remains Próxima
now={dateKey:'2026-09-07',minutes:12*60};
assert.equal(getPunctualityState(appt('10:00','10:30','confirmada','2026-09-08'),now).key,'upcoming');

// Summary omits 0 atrasadas
const s1=summarizeTodayPunctuality([
  {key:'upcoming'},{key:'starting'},{key:'in_progress'}
]);
assert.equal(s1,'3 en curso o próximas');

const s2=summarizeTodayPunctuality([
  {key:'upcoming'},{key:'late'}
]);
assert.equal(s2,'1 en curso o próxima · 1 atrasada');

// Formatter must accept IANA timezone
const rendered=formatBusinessTime(new Date('2026-09-07T18:00:00Z'),tz,false);
assert.ok(/^\d{1,2}:\d{2}$/.test(rendered));

console.log('PASS punctuality rules');
