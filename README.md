# Fintev

A personal AI finance dashboard — net worth, spending, accounts, goals, and an on-device style assistant that plans with your own data. Static HTML/CSS/JS with no build step, ready for GitHub Pages.

## Screens

| Route | What's there |
| --- | --- |
| `#home` | Net worth in dot-matrix numerals with 1W/1M/1Y change, a 30-day "safe to spend" forecast (hover/tap to scrub), a dotted spending gauge by category, and account allocation. |
| `#ask` | Ask Fintev: a reasoning trace, an answer with sources, and a live trip scenario. Drag the monthly set-aside to see the savings ring, status and answer update; approve the plan. |
| `#insights` | Dot-column cash flow, category breakdown, all accounts and recent activity. |
| `#goals` | Goals with dotted progress rings; add money to any goal. |

Search with the magnifier, <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd> or <kbd>/</kbd>.

## Responsive behaviour

- **Desktop (> 1100px):** two-column dashboard with a vertical navigation rail on the right.
- **Tablet (761–1100px):** net worth spans the full width; spending and accounts sit side by side.
- **Mobile (≤ 760px):** single column, compact header with sync/search, floating bottom navigation that respects safe-area insets.

Respects `prefers-reduced-motion`; all charts have text alternatives and the controls are keyboard reachable.

## Run locally

ES modules need a web server (not `file://`):

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy to GitHub Pages

Option A — GitHub Actions (included): merge to `main`, then in **Settings → Pages** set **Source** to **GitHub Actions**. The workflow in `.github/workflows/pages.yml` publishes the site on every push to `main`.

Option B — branch deploy: in **Settings → Pages** choose **Deploy from a branch**, branch `main`, folder `/ (root)`.

All paths are relative, so the site works at `https://<user>.github.io/fintev/`.

## Structure

```
index.html
manifest.webmanifest
assets/
  css/styles.css
  js/app.js        # rendering, interactions, router
  js/dotmatrix.js  # dotted numeral renderer (SVG)
  js/data.js       # demo data
  favicon.svg
```

All figures are demo data.
