#!/usr/bin/env node

/**
 * Version bump script for Browser LLM extension
 * Updates version in both package.json and src/manifest.json
 *
 * Usage:
 *   node scripts/bump-version.js patch    # 1.0.0 -> 1.0.1
 *   node scripts/bump-version.js minor    # 1.0.0 -> 1.1.0
 *   node scripts/bump-version.js major    # 1.0.0 -> 2.0.0
 *   node scripts/bump-version.js 1.2.3    # Set specific version
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const PACKAGE_JSON = join(rootDir, 'package.json');
const MANIFEST_JSON = join(rootDir, 'src', 'manifest.json');

function readJSON(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function writeJSON(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

function bumpVersion(currentVersion, type) {
  const { major, minor, patch } = parseVersion(currentVersion);

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      // Assume it's a specific version string
      parseVersion(type); // Validate format
      return type;
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Version bump script for Browser LLM extension');
    console.log('');
    console.log('Usage: node scripts/bump-version.js <patch|minor|major|x.y.z> [options]');
    console.log('');
    console.log('Arguments:');
    console.log('  patch       Bump patch version (1.0.0 -> 1.0.1)');
    console.log('  minor       Bump minor version (1.0.0 -> 1.1.0)');
    console.log('  major       Bump major version (1.0.0 -> 2.0.0)');
    console.log('  x.y.z       Set specific version');
    console.log('');
    console.log('Options:');
    console.log('  --no-commit   Skip git commit');
    console.log('  --no-tag      Skip git tag creation');
    console.log('  --help, -h    Show this help message');
    process.exit(args.length === 0 ? 1 : 0);
  }

  const versionArg = args[0];
  const shouldCommit = !args.includes('--no-commit');
  const shouldTag = !args.includes('--no-tag');

  // Read current version from package.json
  const packageJson = readJSON(PACKAGE_JSON);
  const currentVersion = packageJson.version;

  // Calculate new version
  const newVersion = bumpVersion(currentVersion, versionArg);

  console.log(`Bumping version: ${currentVersion} -> ${newVersion}`);

  // Update package.json
  packageJson.version = newVersion;
  writeJSON(PACKAGE_JSON, packageJson);
  console.log(`  Updated: package.json`);

  // Update manifest.json
  const manifestJson = readJSON(MANIFEST_JSON);
  manifestJson.version = newVersion;
  writeJSON(MANIFEST_JSON, manifestJson);
  console.log(`  Updated: src/manifest.json`);

  // Git operations
  if (shouldCommit) {
    try {
      execSync('git add package.json src/manifest.json', { cwd: rootDir, stdio: 'pipe' });
      execSync(`git commit -m "chore: bump version to ${newVersion}"`, { cwd: rootDir, stdio: 'pipe' });
      console.log(`  Created commit: chore: bump version to ${newVersion}`);

      if (shouldTag) {
        // Check if tag already exists
        try {
          execSync(`git rev-parse v${newVersion}`, { cwd: rootDir, stdio: 'pipe' });
          console.log(`  Tag v${newVersion} already exists, skipping tag creation`);
        } catch {
          // Tag doesn't exist, create it
          execSync(`git tag -a v${newVersion} -m "v${newVersion}"`, { cwd: rootDir, stdio: 'pipe' });
          console.log(`  Created tag: v${newVersion}`);
        }
      }
    } catch (error) {
      console.error('  Git operations failed. Changes saved but not committed.');
      console.error(`  Error: ${error.message}`);
    }
  }

  console.log(`\nVersion bumped to ${newVersion}`);
  console.log('\nNext steps:');
  console.log('  1. Review the changes');
  console.log('  2. Push to remote: git push origin master --tags');
  console.log('  3. Create a GitHub release to trigger the publish workflow');
}

main();
