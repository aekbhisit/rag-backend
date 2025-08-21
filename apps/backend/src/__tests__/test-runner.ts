#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { resolve } from 'path';

const testSuites = {
  'unit': 'src/__tests__/unit/**/*.test.ts',
  'integration': 'src/__tests__/integration/**/*.test.ts',
  'e2e': 'src/**/__tests__/**/*.e2e.test.ts',
  'all': 'src/**/*.test.ts',
  'repositories': 'src/__tests__/repositories.test.ts',
  'middleware': 'src/__tests__/middleware.test.ts',
  'app': 'src/__tests__/app.test.ts',
  'public-routes': 'src/routes/public/__tests__/*.test.ts',
  'admin-routes': 'src/routes/admin/__tests__/*.test.ts'
};

const args = process.argv.slice(2);
const suite = args[0] || 'all';
const watch = args.includes('--watch');
const coverage = args.includes('--coverage');
const verbose = args.includes('--verbose');

if (!testSuites[suite]) {
  console.error(`Unknown test suite: ${suite}`);
  console.error('Available suites:', Object.keys(testSuites).join(', '));
  process.exit(1);
}

const testPattern = testSuites[suite];
const projectRoot = resolve(__dirname, '../..');

console.log(`Running ${suite} tests...`);
console.log(`Pattern: ${testPattern}`);
console.log(`Project root: ${projectRoot}`);

const vitestArgs = [
  'vitest',
  'run',
  '-c', 'vitest.config.ts'
];

if (watch) {
  vitestArgs[1] = 'watch';
}

if (coverage) {
  vitestArgs.push('--coverage');
}

if (verbose) {
  vitestArgs.push('--reporter=verbose');
}

// Add the test pattern as a glob pattern
vitestArgs.push(testPattern);

try {
  execSync(vitestArgs.join(' '), {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  });
} catch (error) {
  console.error('Test execution failed:', error.message);
  process.exit(1);
}
