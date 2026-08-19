#!/usr/bin/env node
// Reads Allure's raw *-result.json files and writes a short markdown
// digest — pass/fail counts, duration, and any failures — straight into
// the workflow run's Summary tab (GITHUB_STEP_SUMMARY). The full
// interactive Allure report is generated separately and attached as a
// workflow artifact; GitHub's Summary tab only renders markdown, so this
// digest is the part of the report that's actually visible without
// downloading anything.
import { readdir, readFile, appendFile } from 'node:fs/promises';
import path from 'node:path';

const resultsDir = process.argv[2] ?? 'e2e/allure-results';

async function loadResults(dir) {
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const resultFiles = entries.filter((name) => name.endsWith('-result.json'));
  const results = await Promise.all(
    resultFiles.map(async (name) => {
      const raw = await readFile(path.join(dir, name), 'utf8');
      return JSON.parse(raw);
    }),
  );
  return results;
}

function formatDuration(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function buildMarkdown(results) {
  if (results.length === 0) {
    return '## E2E Nightly Run\n\nNo Allure results were found — the suite may have failed before any test ran.\n';
  }

  const counts = { passed: 0, failed: 0, broken: 0, skipped: 0, unknown: 0 };
  let totalDuration = 0;
  const failures = [];

  for (const result of results) {
    const status = counts[result.status] !== undefined ? result.status : 'unknown';
    counts[status] += 1;
    if (typeof result.start === 'number' && typeof result.stop === 'number') {
      totalDuration += result.stop - result.start;
    }
    if (status === 'failed' || status === 'broken') {
      const message = result.statusDetails?.message?.split('\n')[0] ?? '(no message)';
      failures.push({ name: result.fullName ?? result.name, message });
    }
  }

  const total = results.length;
  const passRate = total > 0 ? Math.round((counts.passed / total) * 100) : 0;
  const icon = counts.failed + counts.broken === 0 ? '✅' : '❌';

  const lines = [
    `## ${icon} Nightly E2E Run`,
    '',
    `**${counts.passed}/${total} passed** (${passRate}%) in ${formatDuration(totalDuration)}`,
    '',
    '| Status | Count |',
    '| --- | --- |',
    `| ✅ Passed | ${counts.passed} |`,
    `| ❌ Failed | ${counts.failed} |`,
    `| ⚠️ Broken | ${counts.broken} |`,
    `| ⏭️ Skipped | ${counts.skipped} |`,
  ];

  if (failures.length > 0) {
    lines.push('', '### Failures', '');
    for (const failure of failures) {
      lines.push(`- **${failure.name}**: ${failure.message}`);
    }
  }

  lines.push(
    '',
    '_Full interactive Allure report is attached to this run as the `allure-report` artifact._',
    '',
  );

  return lines.join('\n');
}

const results = await loadResults(resultsDir);
const markdown = buildMarkdown(results);

if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown + '\n');
} else {
  console.log(markdown);
}
