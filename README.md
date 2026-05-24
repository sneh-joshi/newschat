<p align="center">
  <img src="icon.svg" width="96" height="96" alt="NewsChat logo"/>
</p>

<h1 align="center">NewsChat</h1>

<p align="center">
  A Chrome extension that opens a side panel on news articles and lets you ask AI questions about what you're reading.<br/>
  Answers are grounded in the article text — no hallucinations, no off-topic detours.
</p>

<p align="center">
  <img alt="CI" src="https://github.com/sneh-joshi/newschat/actions/workflows/ci.yml/badge.svg"/>
</p>

## Features

- Side panel UI for article Q&A
- Article extraction from supported news pages
- Anthropic Claude, OpenAI, and OpenAI-compatible local/API endpoints
- Site search commands such as `/search climate policy` and `/related`
- Source cards for articles used in search results
- Local-only API key storage through `chrome.storage.local`

## Supported Sites

| Site | Domain | Search status |
| --- | --- | --- |
| BBC | `bbc.com`, `bbc.co.uk` | Uses BBC JSON search |
| The Guardian | `theguardian.com` | Uses Guardian Content API test key |
| CNN | `cnn.com` | Uses public search page |
| AP News | `apnews.com` | Uses public search page |
| NBC News | `nbcnews.com` | Uses public search page |
| Politico | `politico.com` | Uses public search page |
| Reuters | `reuters.com` | Best effort; Reuters may block automated fetches |
| The New York Times | `nytimes.com` | Best effort; login/subscription may be required |
| Washington Post | `washingtonpost.com` | Best effort; login/subscription may be required |
| Bloomberg | `bloomberg.com` | Best effort; login/subscription may be required |

Publisher sites change often. Some search pages are JavaScript-rendered, paywalled, or protected by bot detection, so related-article search is intentionally best effort.

## Prerequisites

- Node.js 22 or newer
- npm 9 or newer
- Chrome or another Chromium-based browser
- Anthropic or OpenAI API key, or a local OpenAI-compatible endpoint such as Ollama

## Getting Started

Install dependencies:

```bash
npm install
```

Run checks:

```bash
npm run type-check
```

Build the extension:

```bash
npm run build
```

Load the extension:

1. Open `chrome://extensions`.
2. Turn on Developer Mode.
3. Click Load unpacked.
4. Select the generated `dist/` folder.
5. Open a supported article and click the NewsChat toolbar icon.

## Configuration

Open the extension options page and add your API settings:

- Anthropic: use `https://api.anthropic.com/v1`, a Claude model, and an `sk-ant-...` key.
- OpenAI: use `https://api.openai.com/v1`, an OpenAI chat model such as `gpt-4.1-mini`, and an `sk-...` key.
- OpenAI-compatible providers: use the provider base URL and model name. For local Ollama, use `http://localhost:11434/v1`.

API keys are stored locally in Chrome extension storage. Do not commit keys, `.env` files, or screenshots containing secrets.

## Development

Run watch mode while editing:

```bash
npm run dev
```

After each rebuild, refresh the extension in `chrome://extensions` and reload the article tab.

Mock mode is available for UI development in [src/lib/claude.ts](./src/lib/claude.ts):

```ts
export const MOCK_MODE = true
```

Set it back to `false` before real testing or publishing.

## Project Structure

```text
newschat/
├── background.ts          # MV3 service worker and site search
├── content.ts             # Article extraction content script
├── manifest.json          # Chrome extension manifest
├── panel.html             # Side panel entry point
├── options.html           # Options page entry point
├── icons/                 # Extension icons
├── scripts/postbuild.js   # Copies manifest and icons into dist
└── src/
    ├── App.tsx
    ├── components/
    ├── hooks/
    ├── lib/
    └── types/
```

## Notes

**Guardian API key** — site search uses the public `test` key (`api-key=test`), which is rate-limited to ~50 requests per day across all users. If the extension gains significant usage, Guardian search will silently degrade. Consider asking users to supply their own free key via the options page.

**Reuters search** — uses an undocumented internal JSON API that could change without notice. Marked "best effort" accordingly.

## Before publishing to the Chrome Web Store

- Confirm `npm run type-check` passes.
- Confirm `npm run build` completes.
- Load `dist/` in Chrome and test at least one free article.
- Review `manifest.json` host permissions.

## License

MIT
