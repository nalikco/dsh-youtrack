# dsh-youtrack

YouTrack for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

- **Links a session to an issue.** The first real issue key (`RW-23112`, `DL-4580`, …) in any of the session's prompts is verified against YouTrack and kept as the session's issue. Words that only look like keys (`UTF-8`, `SHA-256`) are ignored because YouTrack answers 404 for them.
- **Titles the session from the issue.** The session is renamed to `KEY Summary`. A title you typed yourself is never overwritten.
- **Shows the issue in the session list.** A compact badge (project, state, and a priority marker in the colors YouTrack defines) sits at the end of the row; hovering the row shows project, state, priority and a link to the issue.
- **Bundles the YouTrack MCP server.** Tools appear as `mcp__YouTrack__*`; no separate MCP entry is needed.

## Install

In DSH open *Plugins* and install the bundle from GitHub: `github:nalikco/dsh-youtrack`.

Then open **Settings → General → YouTrack**, paste a [permanent token](https://www.jetbrains.com/help/youtrack/server/manage-permanent-token.html) and press *Save*. The row reports whether YouTrack accepts it.

The token is stored in DSH's credential store under `YOUTRACK_TOKEN` (never in configuration files) and is used for both REST calls and the MCP server. Changing it restarts the MCP connection automatically.

## Configuration

```yaml
- id: youtrack
  name: dsh-youtrack
  config:
    baseUrl: https://example.youtrack.cloud   # default: https://xlab.youtrack.cloud
    mcp: true                                  # set false to skip the MCP server
```

If your agent presets list their plugins explicitly, remove their own YouTrack MCP entry; this plugin starts the `YouTrack` MCP server itself, and two servers with one name conflict.

## Notes

- Without a token the plugin does nothing and makes no requests.
- Issue data is cached for a minute and refreshed in the background for sessions visible in the list.
- Only issue keys found in *user* prompts are considered.

## Development

```sh
npm test      # node --test, pure logic in lib/issue.js
npm run check # syntax check
```

MIT
