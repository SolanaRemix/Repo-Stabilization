'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createRepoBrainServer } = require('../backend/server');

test('serves module index and full pipeline endpoint', async () => {
  const rootDir = path.resolve(__dirname, '..');
  const server = createRepoBrainServer({ rootDir });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const { port } = server.address();
  try {
    const modulesResponse = await fetch(`http://127.0.0.1:${port}/api/modules`);
    assert.equal(modulesResponse.status, 200);
    const modulesPayload = await modulesResponse.json();
    assert.equal(modulesPayload.modules.length, 16);

    const pipelineResponse = await fetch(`http://127.0.0.1:${port}/api/pipeline/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(pipelineResponse.status, 200);
    const pipelinePayload = await pipelineResponse.json();
    assert.equal(pipelinePayload.modulesExecuted.length, 16);
    assert.ok(pipelinePayload.results['fix-safe']);
  } finally {
    await new Promise((resolve) => server.close(() => resolve()));
  }
});
