# Contributing to NewsChat

Thanks for your interest! Below is everything you need to get up and running.

## Development setup

```bash
npm install
npm run dev      # watch mode — rebuilds on save
```

Load the `dist/` folder as an unpacked extension in `chrome://extensions` (Developer Mode on), then reload the extension after each rebuild.

## Before opening a pull request

```bash
npm run type-check   # must pass — TypeScript strict mode is enforced
npm run build        # confirm the full build completes
```

Load `dist/` in Chrome and test at least one free article end-to-end.

## Project layout

| Path | Purpose |
|---|---|
| `background.ts` | MV3 service worker — site search, message routing. **No imports from `src/`.** |
| `content.ts` | Content script — DOM article extraction. Self-contained IIFE. |
| `src/lib/claude.ts` | All AI provider logic — streaming, prompt building, keyword generation. |
| `src/hooks/useChat.ts` | React hook — command parsing, search flow, streaming state. |
| `src/hooks/useArticle.ts` | React hook — article loading state machine. |
| `src/lib/siteSearch.ts` | Site config table, mock helpers, paywall detection. |

Note: `background.ts` keeps its own copy of search URLs (`SEARCH_URL_MAP`) because the service worker build is isolated from `src/`. Keep them in sync when adding a new site.

## Adding a new news site

1. Add the hostname to `SUPPORTED_HOSTNAMES` in `background.ts`.
2. Add a search URL builder to `SEARCH_URL_MAP` in `background.ts`.
3. Add the same hostname and URL to `SUPPORTED_SITES` in `src/lib/siteSearch.ts`.
4. Add the hostname to `manifest.json` — both `host_permissions` and `content_scripts.matches`.
5. Test `/search` and `/related` on a real article from that site.

## Regenerating icons

The `icons/` PNGs were derived from `icon.svg`. To regenerate at all three sizes:

```bash
# Requires Inkscape
inkscape icon.svg --export-filename=icons/icon128.png --export-width=128
inkscape icon.svg --export-filename=icons/icon48.png  --export-width=48
inkscape icon.svg --export-filename=icons/icon16.png  --export-width=16
```

Or use any SVG-to-PNG tool you prefer.

## What not to commit

- API keys, `.env` files, screenshots containing secrets
- The `dist/` folder — it is in `.gitignore` and built locally
- `node_modules/`
