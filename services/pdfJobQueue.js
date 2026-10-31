class PdfQueueFullError extends Error {
  constructor() {
    super('PDF rendering is busy. Please retry shortly.');
    this.name = 'PdfQueueFullError';
    this.statusCode = 503;
  }
}

function createSerialQueue({ maxPending = 2 } = {}) {
  const pending = [];
  const idleWaiters = [];
  let active = false;

  function resolveIdleWaiters() {
    if (active || pending.length) return;
    while (idleWaiters.length) idleWaiters.shift()();
  }

  async function startNext() {
    if (active) return;
    const job = pending.shift();
    if (!job) {
      resolveIdleWaiters();
      return;
    }

    active = true;
    try {
      job.resolve(await job.task());
    } catch (error) {
      job.reject(error);
    } finally {
      active = false;
      void startNext();
    }
  }

  return {
    run(task) {
      if (typeof task !== 'function') return Promise.reject(new TypeError('PDF queue task must be a function'));
      if (active && pending.length >= maxPending) return Promise.reject(new PdfQueueFullError());
      const result = new Promise((resolve, reject) => pending.push({ task, resolve, reject }));
      void startNext();
      return result;
    },
    whenIdle() {
      if (!active && !pending.length) return Promise.resolve();
      return new Promise((resolve) => idleWaiters.push(resolve));
    },
    getStats() {
      return { active, pending: pending.length, maxPending };
    }
  };
}

module.exports = { createSerialQueue, PdfQueueFullError };
