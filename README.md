# Fintev — money that has a mood

A calm, plain-language money app. **Pip**, a small character, reads your accounts, shows what's safe to spend, and answers questions with live visuals instead of walls of text. Static HTML/CSS/JS — no build step — ready for GitHub Pages.

## What makes it its own

- **Shapes → Blur → Design.** Screens start as soft blurred shapes; pastel colour-block cards sit on top. The whole backdrop shifts with your money's mood.
- **Pip, the mascot.** Its face is a handful of numbers (eye height, mouth curve, brow tilt) that tween between six moods: calm, happy, joy, curious, worried, thinking. Mood is driven by real data — spending pace vs. the month, goals filling up, an approved plan. Pip's eyes follow your pointer.
- **An assistant that answers with visuals.** Ask Pip and get a plain sentence plus an interactive card:
  | Ask | You get |
  | --- | --- |
  | "Can I afford Lisbon in March?" | Savings staircase with a live slider, verdict and funding sources; approve to celebrate |
  | "Can I buy a $900 laptop?" (any amount) | Safe-to-spend forecast with and without the purchase, lowest point, recovery date, and a verdict |
  | "Where did my paycheck go?" | Sankey: income → needs / wants / saved / left over → categories |
  | "What can I cancel?" | Subscriptions with toggles and yearly savings |
  | "How much did I spend on food?" (or any category) | Budget meter, weekly bars, recent purchases, vs. last month |
  | "What's my net worth?", "How am I doing?", "What are my goals?" | Scrubbable chart, pace check, goal jars |
- **Finance made understandable.** Card titles are sentence fragments ("You're worth", "Free to spend"). Bills are shown as *already set aside* so they never dent safe-to-spend. Spending is blobs sized by amount; goals are jars that fill up and change expression.

## Pages

| Route | |
| --- | --- |
| `#home` | Mood headline, ask bar, net worth, free-to-spend runway, spending blobs, accounts, goal jars |
| `#ask` | Ask Pip |
| `#money` | Stacked wealth chart, budget check, paycheck flow, recurring, activity |
| `#goals` | Goal jars; add $100 to any goal |
| `brand.html` | Brand sheet: Shapes → Blur → Design, Pip's moods, colour, type, parts, voice |

Search with the magnifier, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd> or <kbd>/</kbd> — or just type a question.

## Responsive

Desktop: floating pill nav and a bento grid. Tablet: cards reflow. Mobile: single column, bottom tab bar (safe-area aware), horizontally scrolling goal jars. Respects `prefers-reduced-motion`; charts have text alternatives; everything is keyboard-reachable.

## Run locally

ES modules need a server (not `file://`):

```sh
python3 -m http.server 8000   # open http://localhost:8000
```

## Deploy to GitHub Pages

Merge to `main`, then in **Settings → Pages** set **Source** to **GitHub Actions** — `.github/workflows/pages.yml` publishes on every push to `main`. (Or choose *Deploy from a branch → main → / (root)*.) All paths are relative, and fonts are self-hosted, so it works at `https://<user>.github.io/fintev/`.

## Structure

```
index.html · brand.html · manifest.webmanifest
assets/
  css/styles.css, brand.css
  fonts/        Fraunces, Figtree, Caveat (self-hosted, SIL OFL)
  js/app.js       views, router, search
  js/ask.js       the assistant and its visual cards
  js/mascot.js    Pip and mood tweening
  js/charts.js    area, runway, bubbles, sankey, jars (hand-drawn SVG)
  js/shapes.js    blob + smooth-line helpers
  js/data.js      demo data, forecast logic, mood rules
```

All figures are demo data anchored to Monday, 26 Oct 2026.
