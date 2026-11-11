# dsh-youtrack

YouTrack for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

- **Links a session to an issue.** The first real issue key (`RW-23112`, `DL-4580`, …) in the session's **first user message** is verified against YouTrack and kept as the session's issue. Keys mentioned later, or by the assistant, are only mentions and never link the session. Words that only look like keys (`UTF-8`, `SHA-256`) are ignored because YouTrack answers 404 for them.
- **Titles the session from the issue.** The session is renamed to the issue summary alone (the key is already shown in the list). A title you typed yourself is never overwritten; after an app restart a title this plugin set earlier is recognised only while it still matches the issue.
- **Shows the issue in the session list.** A compact badge (project, state, and a priority marker in the colors YouTrack defines) sits at the end of the row; hovering the row shows project, state, priority and a link to the issue.
- **Bundles the YouTrack MCP server.** Tools appear as `mcp__YouTrack__*`; no separate MCP entry is needed.

## Install

In DSH open *Plugins* and install the bundle from GitHub: `github:nalikco/dsh-youtrack`.

Then open the **YouTrack** plugin page (*Plugins → YouTrack*), enter your YouTrack address, paste a [permanent token](https://www.jetbrains.com/help/youtrack/server/manage-permanent-token.html) and press *Save* next to each. Both apply immediately, without a restart; once the token works, the block shows your YouTrack profile (name, login and picture) in an account card, or the reason YouTrack refused it.

The token is stored in DSH's credential store under `YOUTRACK_TOKEN` (never in configuration files) and is used for both REST calls and the MCP server. Changing it restarts the MCP connection automatically.

## Configuration

```yaml
- id: youtrack
  name: dsh-youtrack
  config:
    baseUrl: https://example.youtrack.cloud   # default: https://xlab.youtrack.cloud (also editable on the plugin page)
    mcp: true                                  # set false to skip the MCP server
```

If your agent presets list their plugins explicitly, remove their own YouTrack MCP entry; this plugin starts the `YouTrack` MCP server itself, and two servers with one name conflict.

## Notes

- Without a token the plugin does nothing and makes no requests.
- Issue data is cached for a minute and refreshed in the background for sessions visible in the list.
- Only the first user message is read; a session whose first message names no real issue stays unlinked.

## Development

```sh
npm test      # node --test, pure logic in lib/issue.js
npm run check # syntax check
```

MIT
