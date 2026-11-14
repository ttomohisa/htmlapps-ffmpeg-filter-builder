import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// GitHub CLI may emit a JSON HTTP error document on stdout when it exits nonzero.
// Only an explicit 404 means that a missing tag can safely be created.
export function interpretTagLookup(exitCode, responseText, expectedSha) {
  let response;
  try {
    response = JSON.parse(responseText);
  } catch {
    throw new Error('Unable to verify version tag: GitHub returned invalid or empty JSON.');
  }

  if (exitCode === 0) {
    const foundSha = response?.object?.sha;
    if (typeof foundSha !== 'string' || !/^[a-f0-9]{40}$/i.test(foundSha)) {
      throw new Error('Unable to verify version tag: response has no valid Git SHA.');
    }
    if (foundSha.toLowerCase() !== expectedSha.toLowerCase()) {
      throw new Error(`Version tag already points to ${foundSha}, not built commit ${expectedSha}.`);
    }
    return 'existing';
  }
  if ((response?.status === 404 || response?.status === '404') && response?.message === 'Not Found') {
    return 'missing';
  }
  throw new Error('Unable to verify version tag: GitHub API lookup failed.');
}

export function verifyReleaseTag({ repository, tag, expectedSha, run = args => spawnSync('gh', args, { encoding: 'utf8' }) }) {
  if (!/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(repository ?? '')) {
    throw new Error('Missing or invalid GITHUB_REPOSITORY.');
  }
  if (!/^v[0-9]+\.[0-9]+\.[0-9]+$/.test(tag ?? '')) {
    throw new Error('Invalid stable version tag.');
  }
  if (!/^[a-f0-9]{40}$/i.test(expectedSha ?? '')) {
    throw new Error('Missing or invalid built commit SHA.');
  }
  const result = run(['api', `repos/${repository}/git/ref/tags/${tag}`]);
  if (result.error || !Number.isInteger(result.status)) {
    throw new Error('Unable to verify version tag: GitHub CLI could not run.');
  }
  return interpretTagLookup(result.status, result.stdout ?? '', expectedSha);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const tag = process.argv[2];
    const state = verifyReleaseTag({
      repository: process.env.GITHUB_REPOSITORY,
      tag,
      expectedSha: process.argv[3],
    });
    console.log(state === 'missing'
      ? `Tag ${tag} is absent; creating release from this verified build.`
      : `Tag ${tag} already points to this verified build.`);
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exitCode = 1;
  }
}
