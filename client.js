window.__ModuleLoader__.load({
  id: 'dsh-youtrack',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'dshYoutrack';
    const API = '/api/youtrack';
    const TOKEN_REF = 'YOUTRACK_TOKEN';
    const REFRESH_MS = 60_000;
    const BATCH_MS = 150;

    const en = {
      project: 'Project', state: 'State', priority: 'Priority', open: 'Open in YouTrack', noValue: '—',
      hostLabel: 'YouTrack address', hostPlaceholder: 'https://example.youtrack.cloud', tokenLabel: 'Access token', hostSaved: 'Address saved', hostFailed: 'Could not save the address.',
      settingsTitle: 'YouTrack', settingsHint: 'Address and access token for YouTrack. It links sessions to issues, titles them and starts the YouTrack MCP server. Create a permanent token in your YouTrack profile.',
      tokenSet: 'Token is set', tokenMissing: 'Token is not set', tokenPlaceholder: 'Paste a permanent token',
      save: 'Save', remove: 'Remove', saving: 'Saving…', saved: 'Saved', failed: 'Could not save the token.',
      readOnly: 'The credential store is read-only.', checking: 'Checking…',
      authFailed: 'YouTrack rejected the token.', unreachable: 'YouTrack is unreachable.', connected: 'Connected', account: 'Account', notConnected: 'Not connected', signOut: 'Disconnect',
    };
    const ru = {
      project: 'Проект', state: 'Состояние', priority: 'Срочность', open: 'Открыть в YouTrack', noValue: '—',
      hostLabel: 'Адрес YouTrack', hostPlaceholder: 'https://example.youtrack.cloud', tokenLabel: 'Токен доступа', hostSaved: 'Адрес сохранён', hostFailed: 'Не удалось сохранить адрес.',
      settingsTitle: 'YouTrack', settingsHint: 'Адрес и токен доступа к YouTrack. Связывает сессии с задачами, берёт из них названия и запускает MCP-сервер YouTrack. Постоянный токен создаётся в профиле YouTrack.',
      tokenSet: 'Токен задан', tokenMissing: 'Токен не задан', tokenPlaceholder: 'Вставьте постоянный токен',
      save: 'Сохранить', remove: 'Удалить', saving: 'Сохранение…', saved: 'Сохранено', failed: 'Не удалось сохранить токен.',
      readOnly: 'Хранилище секретов доступно только для чтения.', checking: 'Проверяю…',
      authFailed: 'YouTrack отклонил токен.', unreachable: 'YouTrack недоступен.', connected: 'Подключён', account: 'Аккаунт', notConnected: 'Не подключён', signOut: 'Отключить',
    };

    const css = `
.yt-chip{display:inline-flex;align-items:center;gap:5px;flex:none;min-width:0;max-width:128px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}
.yt-chip-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.yt-dot{flex:none;width:6px;height:6px;box-sizing:border-box;border-radius:50%;background:var(--yt-dot,transparent);border:1px solid var(--yt-ring,transparent)}
.yt-hover{display:flex;flex-direction:column;gap:4px;min-width:0}
.yt-hover-row{display:flex;align-items:center;gap:8px;min-width:0;font-size:12px;line-height:16px}
.yt-hover-label{flex:none;width:64px;color:#adb2b8}
.yt-hover-value{min-width:0;display:inline-flex;align-items:center;gap:6px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.yt-pill{display:inline-flex;align-items:center;padding:0 6px;border-radius:4px;background:rgba(255,255,255,.12);color:#fff}
.yt-link{color:#8ab4ff;text-decoration:none;font-size:12px;line-height:16px}
.yt-link:hover{text-decoration:underline}
.yt-set{display:flex;flex-direction:column;gap:8px;padding:16px 0;color:var(--dsw-alias-label-primary);border-bottom:.5px solid var(--dsw-alias-border-l2)}
.yt-set-head{display:flex;align-items:center;justify-content:space-between;gap:16px}
.yt-set-title{margin:0;font-size:14px;line-height:22px;font-weight:500}
.yt-set-hint{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.yt-set-status{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.yt-set-status[data-tone=ok]{color:var(--dsw-alias-state-success-primary)}
.yt-set-status[data-tone=error]{color:var(--dsw-alias-state-error-primary)}
.yt-set-label{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.yt-set-form{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.yt-input{flex:1;min-width:200px;height:32px;padding:0 10px;box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;outline:none}
.yt-input:focus{border-color:var(--dsw-alias-state-business-primary)}
.yt-btn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 12px;border:none;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;cursor:pointer}
.yt-btn:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.yt-btn[data-primary]{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3)}
.yt-btn[data-primary]:hover:not(:disabled){background:var(--dsw-alias-label-primary);opacity:.9}
.yt-btn:disabled{opacity:.4;cursor:not-allowed}
.yt-card{display:flex;align-items:center;gap:16px;padding:16px 20px;border-radius:var(--dsw-radius-panel);border:.5px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-2)}
.yt-avatar{flex:none;width:44px;height:44px;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#79bef6,#5057d6);color:#fff;font-size:16px;font-weight:500}
.yt-avatar img{width:100%;height:100%;object-fit:cover;display:block}
.yt-card-body{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}
.yt-card-name{font-size:15px;line-height:22px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.yt-card-sub{display:flex;align-items:center;gap:8px;font-size:13px;line-height:18px;color:var(--dsw-alias-label-secondary);min-width:0}
.yt-card-sub span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.yt-state-dot{flex:none;width:8px;height:8px;border-radius:2px;background:var(--dsw-alias-label-dimmed)}
.yt-state-dot[data-tone=ok]{background:var(--dsw-alias-state-success-primary)}
.yt-state-dot[data-tone=error]{background:var(--dsw-alias-state-error-primary)}
.yt-btn.danger{border:.5px solid var(--dsw-alias-border-l3);color:var(--dsw-alias-state-error-primary)}
`;

    async function call(body) {
      const response = await fetch(API, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || response.statusText);
      return data;
    }

    // One shared store: rows subscribe by session id, requests are batched and refreshed on a timer while anyone listens.
    function createStore() {
      const issues = new Map();
      const watchers = new Map();
      const listeners = new Set();
      let status = 'ok';
      let timer; let refresh; let inflight = false; let dirty = false;
      const notify = () => listeners.forEach((fn) => fn());
      async function flush() {
        if (inflight) { dirty = true; return; }
        const ids = [...watchers.keys()];
        if (ids.length === 0) return;
        inflight = true;
        try {
          const result = await call({ action: 'issues', sessionIds: ids });
          status = result.status;
          for (const id of ids) {
            const next = result.issues?.[id] ?? null;
            if (JSON.stringify(issues.get(id) ?? null) !== JSON.stringify(next)) issues.set(id, next);
          }
          snapshot = { issues: new Map(issues), status };
          notify();
        } catch { /* the next tick retries */ } finally {
          inflight = false;
          if (dirty) { dirty = false; schedule(); }
        }
      }
      function schedule() { clearTimeout(timer); timer = setTimeout(flush, BATCH_MS); }
      let snapshot = { issues: new Map(), status };
      return {
        subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        getSnapshot: () => snapshot,
        watch(id) {
          watchers.set(id, (watchers.get(id) ?? 0) + 1);
          if (watchers.size === 1 && watchers.get(id) === 1) refresh = setInterval(() => { if (!document.hidden) flush(); }, REFRESH_MS);
          if (!issues.has(id)) schedule();
          return () => {
            const n = (watchers.get(id) ?? 1) - 1;
            if (n <= 0) watchers.delete(id); else watchers.set(id, n);
            if (watchers.size === 0) { clearInterval(refresh); clearTimeout(timer); }
          };
        },
        reload() { issues.clear(); snapshot = { issues: new Map(), status }; notify(); schedule(); },
      };
    }

    function useIssue(store, sessionId) {
      React.useEffect(() => store.watch(sessionId), [store, sessionId]);
      return React.useSyncExternalStore(store.subscribe, () => store.getSnapshot().issues.get(sessionId) ?? null);
    }

    const tint = (value) => (value && value.bg ? { background: value.bg, color: value.fg || '#fff' } : undefined);

    // YouTrack styles values for a light UI; a near-white or near-black fill would glare in the list, so it becomes a ring.
    function luminance(hex) {
      const h = hex.replace('#', ''); const f = h.length <= 4 ? h.split('').map((c) => c + c).join('') : h;
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    const dotStyle = (value) => {
      if (!value || !value.bg || Number.isNaN(luminance(value.bg)) || luminance(value.bg) > 0.88 || luminance(value.bg) < 0.06) return { '--yt-ring': 'var(--dsw-alias-label-tertiary)' };
      return { '--yt-dot': value.bg };
    };

    function Row({ store, sessionId }) {
      const issue = useIssue(store, sessionId);
      if (!issue) return null;
      const label = [issue.project.key, issue.state?.name].filter(Boolean).join(' · ');
      return h('span', { className: 'yt-chip', 'data-youtrack-row': issue.key, title: `${issue.key} — ${[issue.state?.name, issue.priority?.name].filter(Boolean).join(', ')}` },
        h('style', null, css),
        issue.priority && h('span', { className: 'yt-dot', style: dotStyle(issue.priority), role: 'img', 'aria-label': issue.priority.name }),
        h('span', { className: 'yt-chip-text' }, label));
    }

    function Hover({ store, sessionId, t }) {
      const issue = useIssue(store, sessionId);
      if (!issue) return null;
      const line = (label, value) => h('div', { className: 'yt-hover-row' },
        h('span', { className: 'yt-hover-label' }, label), h('span', { className: 'yt-hover-value' }, value));
      return h('div', { className: 'yt-hover', 'data-youtrack-hover': issue.key },
        h('style', null, css),
        h('a', { className: 'yt-link', href: issue.url, target: '_blank', rel: 'noreferrer noopener', onClick: (e) => e.stopPropagation() }, `${issue.key} · ${t('open')}`),
        line(t('project'), issue.project.name === issue.project.key ? issue.project.key : `${issue.project.key} — ${issue.project.name}`),
        line(t('state'), issue.state ? h('span', { className: 'yt-pill', style: tint(issue.state) }, issue.state.name) : t('noValue')),
        line(t('priority'), issue.priority ? h('span', { className: 'yt-pill', style: tint(issue.priority) }, issue.priority.name) : t('noValue')));
    }

    function TokenRow({ ctx, t, store }) {
      React.useSyncExternalStore((fn) => ctx.locale.subscribe(fn), () => ctx.locale.getSnapshot());
      const [info, setInfo] = React.useState(null); // { configured, writable }
      const [check, setCheck] = React.useState(null); // { status, name }
      const [value, setValue] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [message, setMessage] = React.useState('');
      const [cfg, setCfg] = React.useState(null); // { baseUrl, revision }
      const [host, setHost] = React.useState('');
      const [hostMessage, setHostMessage] = React.useState('');
      const loadConfig = React.useCallback(() => call({ action: 'config' }).then((c) => { setCfg(c); setHost(c.baseUrl); }).catch(() => undefined), []);
      React.useEffect(() => { loadConfig(); }, [loadConfig]);
      const saveHost = async (event) => {
        event.preventDefault();
        setBusy(true); setHostMessage('');
        try {
          const c = await call({ action: 'set-host', baseUrl: host, revision: cfg.revision });
          setCfg(c); setHost(c.baseUrl); setHostMessage(t('hostSaved')); store.reload();
          setCheck(null); call({ action: 'status' }).then(setCheck).catch(() => setCheck({ status: 'error' }));
        } catch (error) { setHostMessage(`${t('hostFailed')} ${error.message || ''}`.trim()); loadConfig(); } finally { setBusy(false); }
      };

      const read = React.useCallback(async () => {
        const response = await ctx.remote.credentials.describe([TOKEN_REF]);
        if (!response.ok) return;
        const view = response.value[TOKEN_REF];
        const next = { configured: view?.configured ?? false, writable: view?.writable ?? true };
        setInfo(next);
        if (!next.configured) { setCheck(null); return; }
        setCheck(null);
        call({ action: 'status' }).then(setCheck).catch(() => setCheck({ status: 'error' }));
      }, []);
      React.useEffect(() => { read(); return ctx.remote.$on('credentials/reference-updated', (ref) => { if (ref === TOKEN_REF) read(); }); }, [read]);

      const save = async (event) => {
        event.preventDefault();
        const token = value.trim();
        if (!token) return;
        setBusy(true); setMessage('');
        try {
          const response = await ctx.remote.credentials.set(TOKEN_REF, token);
          if (response && response.ok === false) throw new Error(response.error?.message || '');
          setValue(''); setMessage(t('saved')); await read(); store.reload();
        } catch (error) { setMessage(`${t('failed')} ${error.message || ''}`.trim()); } finally { setBusy(false); }
      };
      const clear = async () => {
        setBusy(true); setMessage('');
        try {
          const response = await ctx.remote.credentials.unset(TOKEN_REF);
          if (response && response.ok === false) throw new Error(response.error?.message || '');
          await read(); store.reload();
        } catch (error) { setMessage(`${t('failed')} ${error.message || ''}`.trim()); } finally { setBusy(false); }
      };

      let statusText = t('checking'); let tone = '';
      if (info && !info.configured) statusText = t('notConnected');
      else if (info && check) {
        if (check.status === 'ok') { statusText = `${t('connected')}${check.login ? ` · @${check.login}` : ''}`; tone = 'ok'; }
        else if (check.status === 'auth') { statusText = t('authFailed'); tone = 'error'; }
        else { statusText = t('unreachable'); tone = 'error'; }
      } else if (info) statusText = t('connected');
      const person = check && check.status === 'ok' ? check : null;
      const initials = person ? ([...(person.name || person.login || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => [...w][0])].join('').toUpperCase() || '?') : 'YT';

      return h('div', { className: 'yt-set' },
        h('style', null, css),
        h('h3', { className: 'yt-set-title' }, t('account')),
        h('div', { className: 'yt-card' },
          h('div', { className: 'yt-avatar', 'aria-hidden': true }, person?.avatar ? h('img', { src: person.avatar, alt: '' }) : initials),
          h('div', { className: 'yt-card-body' },
            h('div', { className: 'yt-card-name' }, person ? (person.name || person.login) : t('settingsTitle')),
            h('div', { className: 'yt-card-sub', role: 'status' }, h('span', { className: 'yt-state-dot', 'data-tone': tone }), h('span', null, statusText))),
          info?.configured && info.writable !== false && h('button', { className: 'yt-btn danger', type: 'button', disabled: busy, onClick: clear }, t('signOut'))),
        h('p', { className: 'yt-set-hint' }, t('settingsHint')),
        h('label', { className: 'yt-set-label' }, t('hostLabel')),
        h('form', { className: 'yt-set-form', onSubmit: saveHost },
          h('input', { className: 'yt-input', type: 'url', autoComplete: 'off', spellCheck: false, 'aria-label': t('hostLabel'), placeholder: t('hostPlaceholder'), value: host, disabled: busy || !cfg, onChange: (e) => { setHost(e.target.value); setHostMessage(''); } }),
          h('button', { className: 'yt-btn', type: 'submit', 'data-primary': true, disabled: busy || !cfg || !host.trim() || host.trim().replace(/\/+$/, '') === cfg.baseUrl }, t('save'))),
        hostMessage && h('span', { className: 'yt-set-status', role: 'status' }, hostMessage),
        h('label', { className: 'yt-set-label' }, t('tokenLabel')),
        info && info.writable === false
          ? h('p', { className: 'yt-set-status', 'data-tone': 'error' }, t('readOnly'))
          : h('form', { className: 'yt-set-form', onSubmit: save },
            h('input', { className: 'yt-input', type: 'password', autoComplete: 'off', spellCheck: false, 'aria-label': t('settingsTitle'), placeholder: t('tokenPlaceholder'), value, disabled: busy, onChange: (e) => { setValue(e.target.value); setMessage(''); } }),
            h('button', { className: 'yt-btn', type: 'submit', 'data-primary': true, disabled: busy || !value.trim() }, t(busy ? 'saving' : 'save')),
            ),
        message && h('span', { className: 'yt-set-status', role: 'status' }, message));
    }

    return {
      inject: ['slots', 'locale', 'remote', 'remote.credentials'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { en, ru }), 'dsh-youtrack: dictionaries');
        const t = ctx.locale.bind(NS);
        const store = createStore();
        ctx.slots.inject('sidebar.session.row.trailing', () => ctx.slots.register(
          { name: 'sidebar.session.row.trailing', id: 'youtrack.row', order: 5, locale: NS },
          (props) => h(Row, { store, sessionId: props.sessionId })));
        ctx.slots.inject('sidebar.session.row.hover', () => ctx.slots.register(
          { name: 'sidebar.session.row.hover', id: 'youtrack.row', order: 5, locale: NS },
          (props) => h(Hover, { store, sessionId: props.sessionId, t: props.t || t })));
        ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register(
          { name: 'plugins.bundle.config', key: 'dsh-youtrack' },
          ({ view }) => (view === 'summary' ? t('settingsHint') : h(TokenRow, { ctx, t, store }))));
      },
    };
  },
});
