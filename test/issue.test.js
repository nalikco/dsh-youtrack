import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractKeys, candidateKeys, parseIssue, titleFor, mayRetitle } from '../lib/issue.js';

test('extractKeys finds issue keys in order without repeats', () => {
  assert.deepEqual(extractKeys('Сделай RW-23112 и RWAM-5, потом снова RW-23112'), ['RW-23112', 'RWAM-5']);
  assert.deepEqual(extractKeys('https://x.youtrack.cloud/issue/DL-4580/foo'), ['DL-4580']);
});

test('extractKeys ignores well-known non-projects and embedded words', () => {
  assert.deepEqual(extractKeys('UTF-8, SHA-256, GPT-4 and ISO-8601'), []);
  assert.deepEqual(extractKeys('abcRW-12 RW-12abc rw-12 R-1 FOO_BAR-1'), []);
});

test('extractKeys tolerates non-strings', () => {
  assert.deepEqual(extractKeys(undefined), []);
  assert.deepEqual(extractKeys(42), []);
});

test('candidateKeys orders by message and caps the list', () => {
  assert.deepEqual(candidateKeys(['no key', 'AB-1 AB-2', 'CD-3']), ['AB-1', 'AB-2', 'CD-3']);
  assert.equal(candidateKeys([Array.from({ length: 20 }, (_, i) => `AB-${i + 1}`).join(' ')]).length, 5);
});

const raw = {
  idReadable: 'RW-23112', summary: 'Добавить на сайт schema.org',
  project: { shortName: 'RW', name: 'Rosewood' },
  customFields: [
    { name: 'State', value: { name: 'In progress', color: { background: '#cce5ff', foreground: '#003d7a' } } },
    { name: 'Priority', value: { name: 'During the day', color: { background: '#e6007a', foreground: '#fff' } } },
    { name: 'Estimate time', value: null },
  ],
};

test('parseIssue builds the browser view with YouTrack colors', () => {
  const issue = parseIssue(raw, 'https://example.youtrack.cloud/');
  assert.equal(issue.key, 'RW-23112');
  assert.deepEqual(issue.project, { key: 'RW', name: 'Rosewood' });
  assert.deepEqual(issue.state, { name: 'In progress', bg: '#cce5ff', fg: '#003d7a' });
  assert.deepEqual(issue.priority, { name: 'During the day', bg: '#e6007a', fg: '#fff' });
  assert.equal(issue.url, 'https://example.youtrack.cloud/issue/RW-23112');
});

test('parseIssue drops hostile colors and rejects malformed input', () => {
  const bad = structuredClone(raw);
  bad.customFields[1].value.color.background = 'red;background:url(x)';
  assert.equal(parseIssue(bad, 'https://h').priority.bg, undefined);
  assert.equal(parseIssue({ summary: 'x' }, 'https://h'), undefined);
  assert.equal(parseIssue(null, 'https://h'), undefined);
  assert.equal(parseIssue({ idReadable: 'RW-1', summary: 's' }, 'https://h').state, undefined);
});

test('titleFor is the summary alone and truncates long ones', () => {
  const issue = parseIssue(raw, 'https://h');
  assert.equal(titleFor(issue), 'Добавить на сайт schema.org');
  const long = parseIssue({ ...raw, summary: 'x'.repeat(400) }, 'https://h');
  assert.equal(titleFor(long).length, 120);
  assert.ok(titleFor(long).endsWith('…'));
  assert.equal(titleFor(parseIssue({ ...raw, summary: '   ' }, 'https://h')), 'RW-23112');
});

test('mayRetitle keeps a hand-typed title but follows our own', () => {
  const issue = parseIssue(raw, 'https://h');
  const typed = { title: 'my own name', source: { kind: 'user' } };
  assert.equal(mayRetitle(undefined, issue), true);
  assert.equal(mayRetitle({ title: 'fix', source: { kind: 'fallback' } }, issue), true);
  assert.equal(mayRetitle(typed, issue), false);
  assert.equal(mayRetitle(typed, issue, 'something else'), false);
  assert.equal(mayRetitle({ title: 'Old summary', source: { kind: 'user' } }, issue, 'Old summary'), true);
  assert.equal(mayRetitle({ title: titleFor(issue), source: { kind: 'user' } }, issue), false);
  assert.equal(mayRetitle({ title: 'RW-23112 Old summary', source: { kind: 'user' } }, issue), true);
});
