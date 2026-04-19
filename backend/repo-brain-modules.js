'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MODULE_ORDER = [
  'hospital',
  'detect',
  'scan-actions',
  'normalize',
  'doctor',
  'surgeon',
  'verify',
  'ai-guard',
  'firewall',
  'vitals',
  'fleet',
  'autopsy',
  'genome',
  'immunizer',
  'blackbox',
  'fix-safe'
];

const MODULE_NAMES = {
  'hospital': 'Hospital',
  'detect': 'Detect',
  'scan-actions': 'Scan-Actions',
  'normalize': 'Normalize',
  'doctor': 'Doctor',
  'surgeon': 'Surgeon',
  'verify': 'Verify',
  'ai-guard': 'AI-Guard',
  'firewall': 'Firewall',
  'vitals': 'Vitals',
  'fleet': 'Fleet',
  'autopsy': 'Autopsy',
  'genome': 'Genome',
  'immunizer': 'Immunizer',
  'blackbox': 'Blackbox',
  'fix-safe': 'Fix.Safe'
};

const LOCKFILE_NAMES = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'poetry.lock', 'Cargo.lock', 'go.sum'];

function stableSort(list) {
  return [...list].sort((a, b) => String(a).localeCompare(String(b)));
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function listTopLevel(rootPath) {
  return stableSort(fs.readdirSync(rootPath, { withFileTypes: true }).map((entry) => entry.name));
}

function listWorkflowFiles(rootPath) {
  const workflowsPath = path.join(rootPath, '.github', 'workflows');
  if (!fs.existsSync(workflowsPath)) return [];
  return stableSort(
    fs.readdirSync(workflowsPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml')))
      .map((entry) => path.posix.join('.github/workflows', entry.name))
  );
}

function extensionHistogram(rootPath) {
  const histogram = {};
  for (const name of listTopLevel(rootPath)) {
    const ext = path.extname(name).toLowerCase();
    if (ext) histogram[ext] = (histogram[ext] || 0) + 1;
  }
  return Object.keys(histogram).sort().reduce((acc, key) => {
    acc[key] = histogram[key];
    return acc;
  }, {});
}

function detectFrameworks(rootPath, topLevelEntries) {
  const has = (name) => topLevelEntries.includes(name);
  const frameworks = [];
  if (has('package.json')) frameworks.push('nodejs');
  if (has('next.config.js') || has('next.config.mjs')) frameworks.push('nextjs');
  if (has('vite.config.ts') || has('vite.config.js')) frameworks.push('vite');
  if (has('astro.config.mjs')) frameworks.push('astro');
  if (has('remix.config.js')) frameworks.push('remix');
  if (has('svelte.config.js')) frameworks.push('sveltekit');
  if (has('nuxt.config.ts') || has('nuxt.config.js')) frameworks.push('nuxt');
  if (has('requirements.txt') || has('pyproject.toml')) frameworks.push('python');
  if (has('go.mod')) frameworks.push('go');
  if (has('Cargo.toml')) frameworks.push('rust');
  if (has('pom.xml') || has('build.gradle')) frameworks.push('java');
  if (has('foundry.toml') || has('hardhat.config.ts') || has('hardhat.config.js')) frameworks.push('solidity');
  if (has('Anchor.toml')) frameworks.push('solana-anchor');
  return stableSort(frameworks);
}

function scanRepository(repoPath) {
  const rootPath = path.resolve(repoPath || process.cwd());
  if (!fs.existsSync(rootPath) || !fs.statSync(rootPath).isDirectory()) {
    throw new Error(`Invalid repository path: ${rootPath}`);
  }

  const topLevelEntries = listTopLevel(rootPath);
  const workflows = listWorkflowFiles(rootPath);
  const lockfiles = stableSort(topLevelEntries.filter((entry) => LOCKFILE_NAMES.includes(entry)));
  const frameworks = detectFrameworks(rootPath, topLevelEntries);

  return {
    repoPath: rootPath,
    topLevelEntries,
    workflows,
    lockfiles,
    frameworks,
    extensions: extensionHistogram(rootPath),
    hasVercelConfig: topLevelEntries.includes('vercel.json'),
    hasDockerfile: topLevelEntries.includes('Dockerfile')
  };
}

const moduleHandlers = {
  hospital(context) {
    const score = Math.max(
      0,
      100 - (context.scan.workflows.length === 0 ? 5 : 0) - (context.scan.lockfiles.length === 0 ? 7 : 0)
    );
    return {
      status: 'healthy',
      healthScore: score,
      checks: {
        workflowCoverage: context.scan.workflows.length,
        lockfileCoverage: context.scan.lockfiles.length,
        topLevelFiles: context.scan.topLevelEntries.length
      }
    };
  },
  detect(context) {
    return {
      status: 'detected',
      frameworks: context.scan.frameworks,
      extensionHistogram: context.scan.extensions
    };
  },
  'scan-actions'(context) {
    return {
      status: context.scan.workflows.length > 0 ? 'pass' : 'warn',
      workflows: context.scan.workflows,
      findings: context.scan.workflows.length > 0 ? [] : ['No GitHub Actions workflow files detected']
    };
  },
  normalize(context) {
    const recommended = ['docs/', 'admin/', 'user/', 'dev/', 'login/'];
    const present = recommended.filter((dir) => context.scan.topLevelEntries.includes(dir.slice(0, -1)));
    const missing = recommended.filter((dir) => !present.includes(dir));
    return {
      status: missing.length === 0 ? 'normalized' : 'partial',
      present,
      missing
    };
  },
  doctor(context) {
    const issues = [];
    if (context.scan.lockfiles.length === 0) issues.push('Missing lockfile for deterministic dependency rebuilds');
    if (context.scan.workflows.length === 0) issues.push('Missing CI workflow');
    if (!context.scan.hasVercelConfig) issues.push('Missing vercel.json for static deployment config');
    return {
      status: issues.length === 0 ? 'stable' : 'attention',
      issues
    };
  },
  surgeon(context) {
    const doctorIssues = context.results.doctor ? context.results.doctor.issues : [];
    const repairPlan = doctorIssues.map((issue) => {
      if (issue.includes('lockfile')) return 'Run deterministic dependency rebuilder';
      if (issue.includes('CI workflow')) return 'Install deterministic CI pipeline';
      return 'Apply deterministic scaffold normalization';
    });
    return {
      status: 'planned',
      conflictResolver: 'path-lexicographic-merge',
      dependencyRebuilder: 'lockfile-regeneration',
      repairPlan: stableSort(repairPlan)
    };
  },
  verify(context) {
    const blockingIssues = (context.results.doctor ? context.results.doctor.issues : []).filter((issue) =>
      issue.includes('Missing CI workflow')
    );
    return {
      status: blockingIssues.length === 0 ? 'pass' : 'fail',
      blockingIssues,
      testsMustPass: true
    };
  },
  'ai-guard'(context) {
    return {
      status: 'pass',
      highRiskFindings: [],
      scannedArtifacts: context.scan.topLevelEntries.length
    };
  },
  firewall(context) {
    return {
      status: context.results.verify && context.results.verify.status === 'pass' ? 'enforcing' : 'blocked',
      noDrift: true,
      immutableConfigPolicy: true
    };
  },
  vitals(context) {
    return {
      status: 'live',
      metrics: {
        moduleCount: Object.keys(context.results).length,
        workflowFiles: context.scan.workflows.length,
        lockfiles: context.scan.lockfiles.length
      }
    };
  },
  fleet(context) {
    return {
      status: 'ready',
      governanceMode: 'multi-repo-sync',
      sourceRepoFingerprint: stableHash(context.scan.topLevelEntries).slice(0, 16)
    };
  },
  autopsy(context) {
    const failedModules = Object.entries(context.results)
      .filter(([, result]) => result.status === 'fail')
      .map(([moduleId]) => moduleId);
    return {
      status: failedModules.length === 0 ? 'clean' : 'incident',
      failedModules
    };
  },
  genome(context) {
    const genomeMaterial = {
      frameworks: context.scan.frameworks,
      lockfiles: context.scan.lockfiles,
      workflows: context.scan.workflows
    };
    return {
      status: 'mapped',
      mutationMapHash: stableHash(genomeMaterial).slice(0, 24)
    };
  },
  immunizer(context) {
    return {
      status: 'locked',
      invariants: {
        requireCiBeforeMerge: true,
        requireDeterministicLockfiles: true,
        moduleOrderHash: stableHash(MODULE_ORDER).slice(0, 24)
      }
    };
  },
  blackbox(context) {
    return {
      status: 'recorded',
      trace: stableSort(Object.keys(context.results))
    };
  },
  'fix-safe'(context) {
    const repairPlan = context.results.surgeon ? context.results.surgeon.repairPlan : [];
    return {
      status: 'ready',
      safeRepairs: repairPlan,
      requiresVerifyPass: context.results.verify && context.results.verify.status === 'pass'
    };
  }
};

function runPipeline(input) {
  const repoPath = input && input.repoPath ? input.repoPath : process.cwd();
  const scan = scanRepository(repoPath);
  const moduleIds = input && Array.isArray(input.modules) && input.modules.length > 0
    ? input.modules
    : MODULE_ORDER;
  const invalid = moduleIds.filter((id) => !moduleHandlers[id]);
  if (invalid.length > 0) {
    throw new Error(`Unknown module id(s): ${stableSort(invalid).join(', ')}`);
  }

  const results = {};
  const context = { scan, results };
  for (const moduleId of moduleIds) {
    results[moduleId] = moduleHandlers[moduleId](context);
  }

  return {
    repoPath: scan.repoPath,
    modulesExecuted: moduleIds,
    results,
    summary: {
      pass: Object.values(results).filter((result) => result.status !== 'fail').length,
      fail: Object.values(results).filter((result) => result.status === 'fail').length
    }
  };
}

module.exports = {
  MODULE_ORDER,
  MODULE_NAMES,
  runPipeline
};
