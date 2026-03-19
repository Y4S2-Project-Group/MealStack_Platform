'use strict';

const { execSync } = require('child_process');

function run(cmd, options = {}) {
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...options }).trim();
}

try {
  execSync('node scripts/export-openapi.js', { stdio: 'inherit' });
  execSync('git diff --exit-code -- contracts', { stdio: 'inherit' });
  console.log('Contract drift check passed: exported contracts are in sync.');
} catch (err) {
  console.error('\nContract drift detected.');
  console.error('Run: npm run contracts:export');
  console.error('Then commit updated files under contracts/.\n');
  if (err.stdout) {
    process.stdout.write(run('git status --short contracts'));
  }
  process.exit(1);
}
