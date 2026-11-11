/**
 * Host half of dsh-youtrack.
 *
 * - Links a Session to the first real YouTrack issue key in its first user message and titles it from the issue.
 * - Serves the issue facts (project, state, priority, colors) to the session list through `/api/youtrack`.
 * - Starts the YouTrack MCP server with the token from the credential store.
 *
 * The token lives in the credential store under TOKEN_REF; configuration never holds it.
 */
import z from '@deepseek-ai/schemastery';
import { candidateKeys, ISSUE_FIELDS, mayRetitle, parseIssue, titleFor } from './lib/issue.js';

export const inject = ['connection', 'credentials', 'sessionQuery', 'sessions', 'settings'];

export const TOKEN_REF = 'YOUTRACK_TOKEN';
export const Config = z.object({
  baseUrl: z.string().default('https://xlab.youtrack.cloud').description('YouTrack base URL, without a trailing slash.').volatile(),
  mcp: z.boolean().default(true).description('Start the YouTrack MCP server (tools named mcp__YouTrack__*).'),
});

const FRESH_MS = 60_000;
const NOT_ISSUE_MS = 60 * 60_000;
const FAILED_MS = 30_000;
const REQUEST_MS = 10_000;
const MAX_SESSIONS = 200;
const MAX_REMEMBERED = 1000;

export function apply(ctx, config) {
  const rawHost = () => (typeof config.baseUrl?.get === 'function' ? config.baseUrl.get() : config.baseUrl);
  /** Current base URL; read on every use because the setting changes live. */
  const host = () => String(rawHost()).replace(/\/+$/, '');

  /** key -> { issue: Issue | null, at, ttl, status } */
  const issues = new Map();
  const inflight = new Map();
  /** sessionId -> candidate keys found in user prompts (derived from the log, rebuilt lazily). */
  const keysBySession = new Map();
  /** sessionId -> key the session is linked to; sticks once set. */
  const links = new Map();
  const scans = new Map();

  const remember = (map, id, value) => {
    map.delete(id);
    map.set(id, value);
    if (map.size > MAX_REMEMBERED) map.delete(map.keys().next().value);
  };

  const token = async () => {
    const hit = await ctx.credentials.resolve(TOKEN_REF);
    const value = hit?.value?.trim();
    return value ? value : undefined;
  };

  async function api(path, signal) {
    const secret = await token();
    if (!secret) return { status: 'no-token' };
    try {
      const response = await fetch(`${host()}/api/${path}`, {
        headers: { Authorization: `Bearer ${secret}`, Accept: 'application/json' },
        signal: AbortSignal.any([AbortSignal.timeout(REQUEST_MS), ...(signal ? [signal] : [])]),
      });
      if (response.status === 401 || response.status === 403) return { status: 'auth' };
      if (response.status === 404) return { status: 'missing' };
      if (!response.ok) return { status: 'error' };
      return { status: 'ok', json: await response.json() };
    } catch {
      return { status: 'error' };
    }
  }

  /** Fetch one issue and record the outcome; concurrent calls for a key share one request. */
  function load(key) {
    const running = inflight.get(key);
    if (running) return running;
    const job = (async () => {
      const result = await api(`issues/${encodeURIComponent(key)}?fields=${encodeURIComponent(ISSUE_FIELDS)}`);
      const now = Date.now();
      if (result.status === 'ok') {
        const issue = parseIssue(result.json, host()) ?? null;
        issues.set(key, { issue, at: now, ttl: issue ? FRESH_MS : NOT_ISSUE_MS, status: 'ok' });
        if (issue) retitleLinked(issue);
      } else if (result.status === 'missing') {
        issues.set(key, { issue: null, at: now, ttl: NOT_ISSUE_MS, status: 'ok' });
      } else if (result.status !== 'no-token') {
        // Keep the last good issue on a transient failure; remember only that the attempt failed.
        const previous = issues.get(key);
        issues.set(key, { issue: previous?.issue ?? null, at: now, ttl: FAILED_MS, status: result.status });
      }
      return issues.get(key);
    })().finally(() => inflight.delete(key));
    inflight.set(key, job);
    return job;
  }

  /** Cached entry; refreshes in the background when stale, waits only when nothing is known yet. */
  async function lookup(key) {
    const entry = issues.get(key);
    if (!entry) return load(key);
    if (Date.now() - entry.at >= entry.ttl) void load(key);
    return entry;
  }

  // --- session titles
  function retitle(session, issue) {
    const titles = ctx.get('sessionTitle');
    if (!titles) return;
    try {
      if (mayRetitle(titles.get(session), issue)) titles.rename(session, titleFor(issue));
    } catch { /* a closing session or an invalid title must not break the feed */ }
  }

  function retitleLinked(issue) {
    for (const [sessionId, key] of links) {
      if (key !== issue.key) continue;
      const session = ctx.sessions.get(sessionId);
      if (session) retitle(session, issue);
    }
  }

  // --- keys per session: only the FIRST user message counts; later mentions are just mentions.
  async function scan(sessionId) {
    const known = keysBySession.get(sessionId);
    if (known) return known;
    const pending = scans.get(sessionId);
    if (pending) return pending;
    const job = (async () => {
      let keys = [];
      let decided = false;
      try {
        const docs = await ctx.sessionQuery.filterEvents(sessionId, [
          { kind: 'type', values: ['user/message'] },
          { kind: 'surface', values: ['current'] },
        ]);
        if (docs.length > 0) { keys = candidateKeys([docs[0].text || '']); decided = true; }
      } catch { /* an unreadable session simply has no link */ }
      if (decided && !keysBySession.has(sessionId)) remember(keysBySession, sessionId, keys);
      return keysBySession.get(sessionId) ?? keys;
    })().finally(() => scans.delete(sessionId));
    scans.set(sessionId, job);
    return job;
  }

  /** The verified issue for a session: the sticky link, else the first candidate YouTrack knows. */
  async function issueOf(sessionId) {
    const linked = links.get(sessionId);
    if (linked) return { entry: await lookup(linked) };
    const keys = await scan(sessionId);
    let failed;
    for (const key of keys) {
      const entry = await lookup(key);
      if (entry.issue) {
        remember(links, sessionId, key);
        const session = ctx.sessions.get(sessionId);
        if (session) retitle(session, entry.issue);
        return { entry };
      }
      if (entry.status !== 'ok') failed = entry;
    }
    return { entry: failed };
  }

  ctx.effect(() => ctx.on('session/event', (session, event) => {
    if (event.type !== 'user/message' || event.data?.source?.kind !== 'user') return;
    if (keysBySession.has(session.id)) return; // the first message already decided this session
    const earlier = session.snapshotEvents().some((e) => e.type === 'user/message' && e.data?.source?.kind === 'user' && e.seq < event.seq);
    if (earlier) { void scan(session.id).then(() => issueOf(session.id)).catch(() => undefined); return; }
    const text = (event.data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    remember(keysBySession, session.id, candidateKeys([text]));
    void issueOf(session.id).catch(() => undefined);
  }), 'dsh-youtrack: session prompts');

  ctx.effect(() => ctx.on('session/disposed', (session) => {
    scans.delete(session.id);
  }), 'dsh-youtrack: session cleanup');

  // --- browser endpoint
  const descriptor = () => {
    const bare = ctx.fiber.entry.options.id.replace(/^include:/, '');
    const row = ctx.settings.describe().find((r) => r.ns === bare || r.ns === `include:${bare}`);
    if (!row) throw new Error('Plugin settings are unavailable');
    return row;
  };

  /** A usable base URL or a thrown reason; only http(s) origins (optionally with a path) are accepted. */
  function checkHost(value) {
    if (typeof value !== 'string') throw new Error('Host must be a string');
    const text = value.trim().replace(/\/+$/, '');
    let url;
    try { url = new URL(text); } catch { throw new Error('Enter a full URL, for example https://example.youtrack.cloud'); }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Only http and https URLs are supported');
    if (url.search || url.hash || url.username || url.password) throw new Error('The URL must not contain a query, fragment or credentials');
    return text;
  }

  async function operate(body) {
    if (body?.action === 'config') return { baseUrl: host(), revision: descriptor().revision };
    if (body?.action === 'set-host') {
      const next = checkHost(body.baseUrl);
      if (!Number.isInteger(body.revision)) throw new Error('Read the settings revision before saving');
      await ctx.settings.update(descriptor().ns, { baseUrl: next }, body.revision);
      issues.clear();
      mcp?.restart();
      return { baseUrl: host(), revision: descriptor().revision };
    }
    if (body?.action === 'status') {
      const result = await api('users/me?fields=login,name');
      if (result.status !== 'ok') return { status: result.status };
      return { status: 'ok', login: String(result.json?.login ?? ''), name: String(result.json?.name ?? '') };
    }
    if (body?.action !== 'issues' || !Array.isArray(body.sessionIds)) throw new Error('Unknown action');
    if (!(await token())) return { status: 'no-token', issues: {} };
    const ids = [...new Set(body.sessionIds.filter((id) => typeof id === 'string'))].slice(0, MAX_SESSIONS);
    const out = {};
    let status = 'ok';
    let next = 0;
    const worker = async () => {
      for (let i = next++; i < ids.length; i = next++) {
        const { entry } = await issueOf(ids[i]).catch(() => ({}));
        out[ids[i]] = entry?.issue ?? null;
        if (entry && entry.status !== 'ok') status = entry.status;
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, ids.length) }, worker));
    return { status, issues: out };
  }

  let mcp;
  ctx.effect(() => ctx.settings.configure({ auto: false }), 'dsh-youtrack: settings page policy');
  ctx.effect(() => ctx.connection.fetch.register({
    path: '/api/youtrack',
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      try {
        return Response.json(await operate(await request.json()), { headers: { 'Cache-Control': 'no-store' } });
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
      }
    },
  }), 'dsh-youtrack: endpoint');

  // --- MCP server (tools mcp__YouTrack__*)
  if (config.mcp) mcp = startMcp(ctx, host, token);
}

/** Run the MCP client with the stored token and restart it whenever the token changes. */
function startMcp(ctx, host, token) {
  let fiber;
  let generation = 0;
  let closed = false;

  const stop = async () => {
    const current = fiber;
    fiber = undefined;
    if (current) await current.dispose?.();
  };

  async function start() {
    const mine = ++generation;
    await stop();
    const secret = await token();
    if (closed || mine !== generation || !secret) return;
    try {
      const mcp = await import('@deepseek-ai/dsh-mcp-client');
      if (closed || mine !== generation) return;
      fiber = ctx.plugin(mcp, {
        serverName: 'YouTrack',
        transport: 'streamable-http',
        url: `${host()}/mcp`,
        headers: { Authorization: `Bearer ${secret}` },
        failOnStartupError: false,
      });
      await fiber;
    } catch (error) {
      ctx.logger?.('dsh-youtrack').warn?.(`MCP server did not start: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  void start();
  ctx.effect(() => ctx.on('credentials/reference-updated', (ref) => {
    if (ref === TOKEN_REF) void start();
  }), 'dsh-youtrack: token changes');
  ctx.effect(() => () => {
    closed = true;
    generation++;
    return stop();
  }, 'dsh-youtrack: mcp');
  return { restart: () => void start() };
}
