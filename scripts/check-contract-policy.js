'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const CHANGELOG = 'contracts/CONTRACT_CHANGELOG.md';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function getCiBaseRef() {
  const base = process.env.GITHUB_BASE_REF;
  if (!base || !base.trim()) {
    return null;
  }
  return `origin/${base}`;
}

function parseVersionFromSource(jsSource) {
  const m = jsSource.match(/version\s*:\s*'([^']+)'/);
  return m ? m[1] : null;
}

function main() {
  const ciBaseRef = getCiBaseRef();
  let diffOutput = '';

  if (ciBaseRef) {
    diffOutput = run(`git diff --name-only ${ciBaseRef}...HEAD`);
  } else {
    // Local developer mode: compare working tree against HEAD.
    const tracked = run('git diff --name-only HEAD');
    const untracked = run('git ls-files --others --exclude-standard');
    diffOutput = [tracked, untracked].filter(Boolean).join('\n');
  }

  const changed = diffOutput.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const changedSwagger = changed.filter((f) => /^services\/[^/]+\/src\/swagger\/swagger\.js$/.test(f));

  if (changedSwagger.length === 0) {
    console.log('Contract policy check passed: no swagger contract changes detected.');
    return;
  }

  if (!changed.includes(CHANGELOG)) {
    console.error(`Contract policy violation: ${CHANGELOG} must be updated when swagger contracts change.`);
    process.exit(1);
  }

  const notBumped = [];

  for (const file of changedSwagger) {
    const abs = path.join(root, file);
    const currentSource = fs.readFileSync(abs, 'utf8');
    const currentVersion = parseVersionFromSource(currentSource);

    let baseSource = '';
    if (!ciBaseRef) {
      // In local mode we cannot reliably compare against a PR base branch.
      continue;
    }
    try {
      baseSource = run(`git show ${ciBaseRef}:${file}`);
    } catch (_err) {
      continue;
    }
    const baseVersion = parseVersionFromSource(baseSource);

    if (currentVersion && baseVersion && currentVersion === baseVersion) {
      notBumped.push({ file, version: currentVersion });
    }
  }

  if (notBumped.length > 0) {
    console.error('Contract policy violation: swagger version must be bumped when contract changes.');
    notBumped.forEach((item) => {
      console.error(` - ${item.file} (still ${item.version})`);
    });
    process.exit(1);
  }

  console.log('Contract policy check passed.');
}

main();
