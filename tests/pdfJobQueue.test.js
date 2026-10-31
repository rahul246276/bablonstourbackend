const test = require('node:test');
const assert = require('node:assert/strict');
const { createSerialQueue } = require('../services/pdfJobQueue');

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test('PDF queue runs one job at a time and rejects excess jobs with 503', async () => {
  const queue = createSerialQueue({ maxPending: 2 });
  const gate = deferred();
  const started = [];
  let concurrent = 0;
  let peakConcurrent = 0;
  const task = (id, wait = false) => async () => {
    started.push(id);
    concurrent += 1;
    peakConcurrent = Math.max(peakConcurrent, concurrent);
    if (wait) await gate.promise;
    concurrent -= 1;
    return id;
  };

  const first = queue.run(task(1, true));
  const second = queue.run(task(2));
  const third = queue.run(task(3));
  await assert.rejects(queue.run(task(4)), (error) => error.statusCode === 503);
  assert.deepEqual(queue.getStats(), { active: true, pending: 2, maxPending: 2 });

  gate.resolve();
  assert.deepEqual(await Promise.all([first, second, third]), [1, 2, 3]);
  assert.deepEqual(started, [1, 2, 3]);
  assert.equal(peakConcurrent, 1);
  assert.deepEqual(queue.getStats(), { active: false, pending: 0, maxPending: 2 });
});

test('a failed PDF job does not block later jobs or sequential work', async () => {
  const queue = createSerialQueue({ maxPending: 2 });
  const failure = new Error('render failed');
  const first = queue.run(async () => { throw failure; });
  const second = queue.run(async () => 'second');

  await assert.rejects(first, failure);
  assert.equal(await second, 'second');
  assert.equal(await queue.run(async () => 'third'), 'third');
  await queue.whenIdle();
  assert.deepEqual(queue.getStats(), { active: false, pending: 0, maxPending: 2 });
});
