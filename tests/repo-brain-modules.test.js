'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { MODULE_ORDER, runPipeline } = require('../backend/repo-brain-modules');

test('runs all listed Repo-Brain modules deterministically', () => {
  const repoPath = path.resolve(__dirname, '..');
  const first = runPipeline({ repoPath, modules: MODULE_ORDER });
  const second = runPipeline({ repoPath, modules: MODULE_ORDER });
  assert.deepEqual(first, second);
  assert.equal(first.modulesExecuted.length, 16);
  assert.equal(first.results.verify.testsMustPass, true);
});
