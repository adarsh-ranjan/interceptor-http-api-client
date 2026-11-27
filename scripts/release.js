#!/usr/bin/env node

/**
 * Release Automation Script for Interceptor
 *
 * Usage:
 *   node scripts/release.js patch    # bumps 1.0.0 -> 1.0.1
 *   node scripts/release.js minor    # bumps 1.0.0 -> 1.1.0
 *   node scripts/release.js major    # bumps 1.0.0 -> 2.0.0
 *   node scripts/release.js 1.2.3    # sets explicit version 1.2.3
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function run(cmd, options = {}) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { stdio: 'inherit', ...options });
}

function getOutput(cmd) {
  return execSync(cmd, { encoding: 'utf-8' }).trim();
}

const arg = process.argv[2];
if (!arg) {
  console.error('\nError: Please provide a release type (patch, minor, major) or a specific version (e.g. 1.0.1)\n');
  console.log('Examples:');
  console.log('  npm run release:patch');
  console.log('  npm run release:minor');
  console.log('  npm run release:major');
  console.log('  node scripts/release.js 1.0.1\n');
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const currentVersion = pkg.version;

// Ensure working tree is clean before releasing
const status = getOutput('git status --porcelain');
if (status && !process.env.FORCE_RELEASE) {
  console.error('\nError: Working tree is not clean. Commit or stash changes before releasing.\n');
  console.log(status);
  process.exit(1);
}

// Compute new version
let newVersion = '';
const semverRegex = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

if (semverRegex.test(arg.replace(/^v/, ''))) {
  newVersion = arg.replace(/^v/, '');
} else {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  if (arg === 'patch') {
    newVersion = `${major}.${minor}.${patch + 1}`;
  } else if (arg === 'minor') {
    newVersion = `${major}.${minor + 1}.0`;
  } else if (arg === 'major') {
    newVersion = `${major + 1}.0.0`;
  } else {
    console.error(`\nError: Invalid argument "${arg}". Expected "patch", "minor", "major", or a valid SemVer (e.g. 1.0.1).\n`);
    process.exit(1);
  }
}

const tag = `v${newVersion}`;
console.log(`\nReleasing Interceptor: ${currentVersion} -> ${newVersion} (${tag})\n`);

// 1. Update version in package.json & package-lock.json
run(`npm version ${newVersion} --no-git-tag-version --allow-same-version`);

// 2. Build the application to verify
console.log('\nVerifying build...');
run('npm run build');

// 3. Commit version bump
console.log('\nCommitting version bump...');
run(`git add package.json package-lock.json`);
run(`git commit -m "chore(release): ${tag}"`);

// 4. Create git tag
console.log(`\nCreating git tag ${tag}...`);
run(`git tag -a ${tag} -m "Release ${tag}"`);

// 5. Push commit and tag to remote
console.log('\nPushing commit and tags to origin...');
try {
  run('git push');
  run(`git push origin ${tag}`);
  console.log(`\n Successfully released and pushed ${tag}!`);
  console.log(`GitHub Actions will now build and publish release distributables for ${tag}.\n`);
} catch (err) {
  console.warn('\nCould not auto-push to remote. You can push manually using:');
  console.log(`  git push && git push origin ${tag}\n`);
}
