import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateText } from '../src/index.js';
import { duplicates, fixture, format } from './helpers.js';

const dir = join(__dirname, 'corpus');
const files = readdirSync(dir).filter((f) => f.endsWith('.arazzo.yaml'));

describe('corpus', () => {
  it('contains valid and invalid documents', () => {
    expect(files.filter((f) => f.startsWith('valid-')).length).toBeGreaterThanOrEqual(3);
    expect(files.filter((f) => f.startsWith('invalid-')).length).toBeGreaterThanOrEqual(3);
  });

  for (const file of files) {
    it(file, () => {
      const text = fixture('corpus', file);
      const r = validateText(text, { debug: true });
      expect(r.errors).toEqual([]);
      expect(duplicates(r.diagnostics)).toEqual([]);
      const problems = r.diagnostics.filter((d) => d.severity === 'error' || d.severity === 'warning');
      if (/^# valid\b/m.test(text)) {
        expect(format(problems)).toBe('');
        return;
      }
      const header = /^# expect: (.+)$/m.exec(text);
      expect(header, 'invalid corpus files declare "# expect: <codes>"').not.toBeNull();
      const expected = header![1]!.split(',').map((s) => s.trim()).sort();
      const actual = [...new Set(problems.map((d) => d.code))].sort();
      expect(actual, format(problems)).toEqual(expected);
      for (const d of r.diagnostics) expect(d.range, `${d.code} has a range`).toBeDefined();
    });
  }
});
