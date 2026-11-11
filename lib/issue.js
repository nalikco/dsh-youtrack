/** Pure helpers: issue keys in prompts, YouTrack issue parsing, session titles. No I/O. */

// Words that look like `ABC-123` but are never tracker projects. They are skipped before any request is made;
// everything else is verified against YouTrack, which answers 404 for a key that is not an issue.
const NOT_PROJECTS = new Set(['UTF', 'SHA', 'MD', 'ISO', 'GPT', 'RFC', 'CVE', 'TLS', 'SSL', 'AES', 'RSA', 'HTTP', 'IPV', 'PDF', 'ES', 'X', 'GB', 'MB', 'KB', 'CP', 'ISO8601']);
const KEY = /(?<![A-Za-z0-9_-])([A-Z][A-Z0-9]{1,9})-(\d{1,7})(?![A-Za-z0-9_])/g;

/** Issue keys in `text`, in order of first appearance, without repeats. */
export function extractKeys(text, limit = 10) {
  const out = [];
  if (typeof text !== 'string') return out;
  for (const match of text.matchAll(KEY)) {
    if (NOT_PROJECTS.has(match[1])) continue;
    const key = `${match[1]}-${match[2]}`;
    if (!out.includes(key)) out.push(key);
    if (out.length >= limit) break;
  }
  return out;
}

/** Candidate keys over several messages, first message first. */
export function candidateKeys(texts, limit = 5) {
  const out = [];
  for (const text of texts) {
    for (const key of extractKeys(text)) if (!out.includes(key)) out.push(key);
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}

/** REST `fields` projection used for every issue read. */
export const ISSUE_FIELDS = 'idReadable,summary,project(shortName,name),customFields($type,name,value(name,color(background,foreground)))';

const color = (value) => {
  const c = value && typeof value === 'object' ? value.color : undefined;
  const ok = (s) => (typeof s === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(s) ? s : undefined);
  return { bg: ok(c?.background), fg: ok(c?.foreground) };
};

function field(json, name) {
  const fields = Array.isArray(json.customFields) ? json.customFields : [];
  const found = fields.find((f) => typeof f?.name === 'string' && f.name.toLowerCase() === name);
  const value = found?.value;
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.name !== 'string') return undefined;
  return { name: value.name, ...color(value) };
}

/** The small, display-ready view of an issue that crosses to the browser; undefined for a malformed response. */
export function parseIssue(json, baseUrl) {
  if (!json || typeof json.idReadable !== 'string' || typeof json.summary !== 'string') return undefined;
  const project = json.project && typeof json.project.shortName === 'string'
    ? { key: json.project.shortName, name: typeof json.project.name === 'string' ? json.project.name : json.project.shortName }
    : { key: json.idReadable.split('-')[0], name: json.idReadable.split('-')[0] };
  return {
    key: json.idReadable,
    summary: json.summary,
    project,
    state: field(json, 'state'),
    priority: field(json, 'priority'),
    url: `${baseUrl.replace(/\/+$/, '')}/issue/${encodeURIComponent(json.idReadable)}`,
  };
}

/** Session title for an issue: "RW-23112 Summary". */
export function titleFor(issue, max = 120) {
  const title = `${issue.key} ${issue.summary}`.replace(/\s+/g, ' ').trim();
  return title.length > max ? `${title.slice(0, max - 1)}…` : title;
}

/**
 * Whether the plugin may replace the current session title. A missing or automatically generated title is
 * replaceable; a title the user typed is kept unless it is one this plugin set earlier (it starts with the key).
 */
export function mayRetitle(current, issue) {
  if (!current) return true;
  if (current.title === titleFor(issue)) return false;
  if (current.source?.kind !== 'user') return true;
  return current.title.startsWith(`${issue.key} `);
}
