#!/usr/bin/env node
// Convertit la sortie JSON de `redocly respect --json-output` en JUnit XML (script R4).
// Usage : node respect-to-junit.mjs respect.json > junit.xml
import { readFileSync } from 'node:fs';

const esc = (s) => String(s ?? '').replace(/[<>&"']/g, (c) =>
  ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));

const report = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const suites = [];
for (const [file, res] of Object.entries(report.files ?? {})) {
  for (const wf of res.executedWorkflows ?? []) {
    const cases = (wf.executedSteps ?? []).map((step) => {
      const failed = (step.checks ?? []).filter((c) => !c.passed && c.severity === 'error');
      const body = failed.length
        ? `<failure message="${esc(failed.map((c) => c.name).join('; '))}">${esc(
            failed.map((c) => `${c.name}: ${c.condition ?? ''}\n${c.message ?? ''}`).join('\n\n'))}</failure>`
        : '';
      return { failed: failed.length > 0,
        xml: `    <testcase classname="${esc(`${file}.${wf.workflowId}`)}" name="${esc(step.stepId)}" time="${((step.totalTimeMs ?? 0) / 1000).toFixed(3)}">${body}</testcase>` };
    });
    const failures = cases.filter((c) => c.failed).length;
    suites.push(`  <testsuite name="${esc(`${file} / ${wf.workflowId}`)}" tests="${cases.length}" failures="${failures}" time="${((wf.totalTimeMs ?? 0) / 1000).toFixed(3)}">\n${cases.map((c) => c.xml).join('\n')}\n  </testsuite>`);
  }
}
process.stdout.write(`<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="arazzo-respect">\n${suites.join('\n')}\n</testsuites>\n`);
