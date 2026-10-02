# Kitlane

**Describe the task, find the tool you saved.**

Kitlane is a browser side-panel extension (Chrome / Edge) that turns your existing bookmarks into a searchable toolbox. Type what you want to do — "shrink an image", "where are the 10-K filings", "an AI that writes slides" — and Kitlane finds the tools, repositories and references you saved, even when you no longer remember their names.

> Status: early beta (1.1.0). English and Chinese UI.

## What it does

- **Works without an API key.** On import, bookmarks are sorted using a built-in knowledge base of ~920 well-known sites, URL patterns (GitHub repos, papers, videos, docs, blogs), your own folder names, and the public description of each page. No model is called.
- **Search by task, not by name.** Local search combines full-text search, task phrases mapped to tags, and substring matching. Optional smart search lets a model re-rank the top 30 local candidates.
- **Collections that follow your tags.** A collection includes every bookmark with its tags; new collections get tags suggested from their name.
- **Bring your own model (optional).** Any OpenAI-compatible API, cloud or local (Ollama, LM Studio), or the Jev decision model. A language model can summarize bookmarks, pick tags from your tag library and judge collection rules.
- **Private by default where it matters.** Nothing leaves your device unless you enable a model. Even then, these are never sent and never fetched: local/LAN addresses, account consoles and admin backends, team workspaces, online documents and file shares, links with credentials, adult content, and pages that turn out to require login.

## Install (development build)

```bash
npm ci
npm run build          # Chrome: .output/chrome-mv3
npm run build:edge     # Edge:   .output/edge-mv3
```

Open `chrome://extensions` (or `edge://extensions`), turn on Developer mode, click **Load unpacked** and choose the output folder. Click the Kitlane icon to open the side panel, then the refresh icon to import your bookmarks.

## Development

- `npm run compile` — type check
- `npm run build` / `npm run build:edge` — build for Chrome / Edge

UI text is written as `t('中文原文')` with the English translation in `src/i18n/en.ts`.

## Privacy

Your bookmark library, tags, notes and search index are stored locally in the browser (IndexedDB). If you enable a model, only the content described in **Settings → Connection and privacy details** is sent, directly to the provider you configured. API keys are stored locally and never included in exports.

## License

[MIT](LICENSE)
