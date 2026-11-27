#!/usr/bin/env node

/**
 * Synchronizes package.json version with the Git tag or workflow input,
 * and sets GitHub Actions step outputs (version, tag, title).
 */

const fs = require('fs');
const path = require('path');

const ref = process.env.GITHUB_REF || '';
const refName = process.env.GITHUB_REF_NAME || '';
const eventName = process.env.GITHUB_EVENT_NAME || '';
const inputVersion = (process.env.INPUT_VERSION || '').trim();

let targetVersion = '';

if (eventName === 'workflow_dispatch' && inputVersion) {
  targetVersion = inputVersion.replace(/^v/, '');
  console.log(`Setting version from workflow_dispatch input: ${targetVersion}`);
} else if (ref.startsWith('refs/tags/')) {
  targetVersion = refName.replace(/^v/, '');
  console.log(`Setting version from git tag: ${targetVersion}`);
}

const pkgPath = path.resolve(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

if (targetVersion) {
  pkg.version = targetVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Updated package.json version to: ${targetVersion}`);
} else {
  console.log(`Using existing package.json version: ${pkg.version}`);
}

// If running in GitHub Actions, populate GITHUB_OUTPUT
const outputFile = process.env.GITHUB_OUTPUT;
if (outputFile) {
  const version = targetVersion || pkg.version;
  const tag = ref.startsWith('refs/tags/') ? refName : `v${version}`;
  const title = `Release ${tag}`;
  fs.appendFileSync(outputFile, `version=${version}\ntag=${tag}\ntitle=${title}\n`);
  console.log(`GitHub Outputs set -> version: ${version}, tag: ${tag}, title: ${title}`);
}
