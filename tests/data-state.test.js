
const assert = require('assert');
const { withDataState, DataTimeoutError } = require('../js/data-state.js');

(async () => {
  const value = await withDataState(() => Promise.resolve(42), { timeoutMs: 50 });
  assert.equal(value, 42);

  let timedOut = false;
  try {
    await withDataState(() => new Promise(() => {}), { timeoutMs: 15 });
  } catch (e) {
    timedOut = e instanceof DataTimeoutError;
  }
  assert.equal(timedOut, true);
  console.log('PASS data-state');
})().catch(e => { console.error(e); process.exit(1); });
