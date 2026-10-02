# Kitlane

> **Describe the task, find the tool you saved.**
> A side-panel extension for Chrome and Edge that turns the bookmarks you already have into a toolbox you can search by what you want to do.

[中文](README.md) · [MIT License](LICENSE) · English and Chinese UI

<!-- TODO: add a screenshot or demo GIF of the side panel: docs/images/demo.gif -->

You know the moment. You are sure you bookmarked a site that shrinks images, but you cannot remember its name. You scroll through folders, give up, search again, and end up with a different tool.

Kitlane is built for that moment. It reads the bookmarks already in your browser, tags each one by what it is for, and lets you type "a site to shrink images" to get it back.

## See it work

Type what you need to do. These come from local search only, with no model and no API key (run on the author's 474-bookmark sample library; the queries are Chinese, shown here in English):

| You type | Top results |
|---|---|
| formatting for WeChat articles | Xiumi, 135 Editor, mdnice |
| memorize vocabulary | Shanbay, Duolingo |
| an AI tool for making slides | AiPPT, iSlide, Gamma |
| collect payments from overseas | PingPong, LianLian Global, Payoneer, Wise |
| Amazon product research tools | SellerSprite, Jungle Scout, Helium 10 |
| a site to shrink images | Squoosh, TinyPNG (plus background-removal and photo tools) |

When you want more, click **Smart search** and a model you configured re-ranks the results.

## What it does

- **Sorts bookmarks without an API key.** On import, every bookmark is classified using a built-in knowledge base of about 920 well-known sites, URL patterns (GitHub repos, papers, videos, docs, blogs), your own folder names and the public description of each page. No model is called.
- **Search by task, not by name.** Local search maps everyday phrasing to tags ("remove background" → image editing, "annual report" → filings). Optional smart search picks the top 30 candidates locally, then asks your model to re-rank them.
- **Collections that follow your tags.** A collection includes every bookmark carrying its tags, so it gets better as tagging gets better. New collections get tags suggested from their names.
- **Bring your own model, optional.** Any OpenAI-compatible API, cloud or local (Ollama, LM Studio), or the Jev decision model. A language model can summarize bookmarks, choose tags from your tag library and judge collection rules.
- **Private stays on your device.** Internal tools, online documents, account consoles, file shares, links with credentials, adult content, and pages that turn out to require login are never sent to a model and never fetched.

## Measured results

Share of bookmarks left unclassified with no model configured (lower is better):

| Bookmark source | Before | Now |
|---|---|---|
| The author's own bookmarks (57) | 78% | **32%** |
| Top-voted Hacker News and Lobsters links (405, not hand-picked) | 75% | **45%**, or **29%** after reading page descriptions |

For search, 60 everyday-language queries over 474 sample bookmarks: the right bookmark is in the local top 30 **97%** of the time, and in the top 5 **92%** of the time.

> Caveats: the author's own set is small (57); the sample bookmarks and queries for the search test were written by the author, so those numbers are optimistic and only good for comparing changes over time. Real-user data is still missing. If you can share anonymous aggregate stats, please open an issue.

## How it differs

There are already more than twenty "AI bookmark" extensions in the Chrome Web Store. Most focus on turning bookmarks into folders with one click, and most need an API key before they do anything. Kitlane makes different trade-offs:

| | Most AI bookmark extensions | Kitlane |
|---|---|---|
| Main job | Organize bookmarks into folders | Find what you saved by task; your folders stay untouched |
| Works without a key? | Usually no | Yes: classification and search run locally |
| Private links | Mostly manual exclusion | Internal tools, documents and account pages detected automatically, handled on-device only |
| Where data goes | Depends on the product | Your library lives in your browser; only if you enable a model is the described content sent to the provider you chose |

## Install

Kitlane is not in a browser store yet, so build it yourself (Node.js 20 or later):

```bash
git clone https://github.com/Tolson64/Kitlane-extension.git
cd Kitlane-extension
npm ci
npm run build          # Chrome: .output/chrome-mv3
npm run build:edge     # Edge:   .output/edge-mv3
```

Open `chrome://extensions` (`edge://extensions` in Edge), turn on Developer mode, click **Load unpacked** and choose the output folder.

## Get started

1. Click the Kitlane icon in the toolbar to open the side panel.
2. Click the refresh icon at the top right to import your bookmarks.
3. Describe what you need in the search box.
4. Optional: click the gear, choose a model, enter its address and key, and tick "Allow the model to analyze public bookmarks" to unlock Smart search. The interface language can be switched here too.

## Privacy

- Your library, tags, notes and search index are stored in your browser's local database. Exports never include API keys.
- With no model enabled, nothing about your bookmarks is sent to any third party.
- With a model enabled, what is sent is your query plus, for public bookmarks, the title, the URL path without parameters, the folder name and the page description. Personal notes, custom titles and private bookmarks are never sent.
- Reading page descriptions needs your permission for each specific site. Kitlane never asks for all sites at once and never sends login information.

The full list of what counts as private and how data flows is in the [technical notes](docs/technical-notes.zh.md) (Chinese).

## Known limitations

- No cloud sync and no JSON import yet. On a new computer you re-import your bookmarks, and tags you adjusted by hand do not travel with you.
- Chrome and Edge only; Safari is not supported.
- API keys are stored in plain text in the browser's local database. That is common for extensions, but you should know.
- The English interface and English tags are new and may read awkwardly in places. Issues welcome.
- How well smart search understands slang and colloquial Chinese depends on the model you pick; we have not compared models systematically.
- Personal blogs and niche sites without a page description may stay unclassified when no model is configured.

## Docs

- [Technical notes](docs/technical-notes.zh.md) (Chinese): feature details, privacy rules, model analysis flow
- [Changelog](CHANGELOG.md)

## Contributing

Found a bug or have an idea? Please open an [issue](https://github.com/Tolson64/Kitlane-extension/issues). Pull requests are welcome.

<!-- TODO: About the author (add after the Xiaohongshu account is provided) -->

## License

[MIT](LICENSE)
