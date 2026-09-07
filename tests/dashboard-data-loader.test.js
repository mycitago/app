
const assert = require('assert');
const { loadBusinessDashboardSnapshot } = require('../js/dashboard-data-loader.js');

(async () => {
  const fake = {
    rpc(name, args) {
      assert.equal(name, 'business_dashboard_snapshot');
      assert.equal(args.p_business_id, 'biz-1');
      return Promise.resolve({
        data: { appointments:[{id:'a'}], services:[{id:'s'}], customers:[{id:'c'}] },
        error: null
      });
    }
  };
  const snap = await loadBusinessDashboardSnapshot(fake, 'biz-1', { timeoutMs: 100 });
  assert.equal(snap.appointments.length, 1);
  assert.equal(snap.services.length, 1);
  assert.equal(snap.customers.length, 1);

  const broken = { rpc: () => Promise.resolve({ data:null, error:{message:'forbidden'} }) };
  let failed=false;
  try { await loadBusinessDashboardSnapshot(broken,'biz-1',{timeoutMs:100}); }
  catch(e){ failed=/forbidden/.test(e.message); }
  assert.equal(failed,true);
  console.log('PASS dashboard loader');
})().catch(e => { console.error(e); process.exit(1); });
