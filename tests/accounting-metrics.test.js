
const assert = require('assert');
const M = require('../js/accounting-metrics.js');

const rows = [
  {appointment_date:'2026-09-05',status:'completada', price_charged:1000, branch_id:'b1', staff_id:'s1', service_id:'v1'},
  {appointment_date:'2026-09-06',status:'completada', price_charged:500, branch_id:'b1', staff_id:'s2', service_id:'v1'},
  {appointment_date:'2026-09-07',status:'confirmada', price_charged:700, branch_id:'b2', staff_id:'s1', service_id:'v2'},
  {appointment_date:'2026-09-08',status:'completada', price_charged:300, branch_id:null, staff_id:null, service_id:'v2'}
];
const staff = [
  {id:'s1', name:'Dr A', commission_rate:20, branch_id:'b1'},
  {id:'s2', name:'Dr B', commission_rate:10, branch_id:'b1'}
];
const branches = [{id:'b1',name:'Matriz'},{id:'b2',name:'Norte'}];
const services = [{id:'v1',name:'Consulta'},{id:'v2',name:'Limpieza'}];

const out = M.aggregateAccounting({
  appointments: rows, staff, branches, services, expenses:[{amount:200,expense_date:'2026-09-09'}], month:'2026-09'
});

assert.strictEqual(out.summary.income, 1800);
assert.strictEqual(out.summary.projected, 700);
assert.strictEqual(out.summary.completed, 3);
assert.strictEqual(out.summary.ticketAverage, 600);
assert.strictEqual(out.summary.commissions, 250);
assert.strictEqual(out.summary.utility, 1350);

const b1 = out.branches.find(x=>x.id==='b1');
assert.strictEqual(b1.income, 1500);
assert.strictEqual(b1.commissions, 250);

const unassigned = out.branches.find(x=>x.id==='unassigned');
assert.strictEqual(unassigned.income, 300);

const s1 = out.staff.find(x=>x.id==='s1');
assert.strictEqual(s1.commissions, 200);
assert.strictEqual(s1.income, 1000);

console.log('accounting-metrics tests passed');
