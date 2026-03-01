# CC Usage

A [Ship Studio](https://shipstudio.dev) plugin that shows your Claude Code spending at a glance — daily, weekly, and monthly — without leaving the editor.

Built on top of [ccusage](https://github.com/ryoppippi/ccusage) by [@ryoppippi](https://github.com/ryoppippi).

## Features

- **Daily / Weekly / Monthly views** — toggle between time ranges with tabs
- **Cost & token totals** — summary cards showing total spend, token count, and cache hits
- **Per-model breakdowns** — click any row to expand cost by model (Opus, Sonnet, Haiku, etc.)
- **Visual cost bars** — relative spend at a glance for each time period
- **Cached results** — last-fetched data loads instantly on open, refresh when you want fresh numbers
- **Theme-aware** — inherits Ship Studio's active theme automatically

## Install

In Ship Studio: open a project, click the **Plugin Manager** (puzzle icon), and paste the repo URL:

```
https://github.com/ship-studio/plugin-ccusage
```

Ship Studio clones the repo and loads the pre-built bundle. No build step required for end users.

### Requirements

- [Ship Studio](https://shipstudio.dev) v0.3.53+
- [Node.js](https://nodejs.org/) (for `npx`)
- [ccusage](https://github.com/ryoppippi/ccusage) is invoked via `npx ccusage` at runtime — no global install needed

## Usage

1. Click the **bar chart icon** in the toolbar
2. The modal opens and automatically fetches your usage data
3. Switch between **Daily**, **Weekly**, and **Monthly** tabs
4. Click any row to see per-model cost breakdowns
5. Hit **Refresh** to pull the latest numbers

Close the modal with `Esc`, the X button, or by clicking outside.

## How it works

The plugin calls `npx ccusage [daily|weekly|monthly] --json` through Ship Studio's shell API. ccusage reads Claude Code's local JSONL usage logs (`~/.claude/usage/`) and returns structured JSON with token counts, costs, and model breakdowns. The plugin parses this data and renders it in a themed modal overlay.

Results are cached to Ship Studio's plugin storage so the last-fetched data appears instantly the next time you open the modal.

## Development

```bash
git clone https://github.com/ship-studio/plugin-ccusage.git
cd plugin-ccusage
npm install
npm run build
```

Link the local folder in Ship Studio via **Plugin Manager > Link Dev Plugin**.

```bash
npm run dev      # watch mode — rebuilds on save
npm run build    # one-off production build
```

After making changes, click **Reload** in Plugin Manager to pick them up.

> **Note:** Ship Studio loads plugins from the committed `dist/index.js`. Always rebuild and commit the bundle before pushing.

## Project structure

```
plugin-ccusage/
├── src/
│   └── index.tsx    # entire plugin — UI, data fetching, styles
├── dist/
│   └── index.js     # built bundle (committed to repo)
├── plugin.json      # plugin manifest (id, name, slots, version)
├── package.json
├── tsconfig.json
└── vite.config.ts   # build config with Ship Studio React shims
```

The plugin is a single-file React component (`src/index.tsx`) that exports a `toolbar` slot. It uses Ship Studio's plugin context API for shell access, persistent storage, and theme colors.

## Credits

- [ccusage](https://github.com/ryoppippi/ccusage) by [@ryoppippi](https://github.com/ryoppippi) — the CLI that reads Claude Code's usage logs and makes this plugin possible
- [plugin-starter](https://github.com/ship-studio/plugin-starter) — Ship Studio's plugin template

## License

MIT
