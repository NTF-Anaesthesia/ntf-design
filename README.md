# ntf-design

The NTF Anaesthesia design kit, served at **https://design.anantf.com/v1/** for apps in other repos (CORS open on
`/v1/`).

| File | What |
|---|---|
| `public/v1/app.css` | App kit: the phone-app design language ([DESIGN-APP.md](DESIGN-APP.md)) |
| `public/v1/specimen.html` | Every component of the app kit |
| `public/v1/fonts/` | Inter, Fraunces, JetBrains Mono, Noto Serif JP (kanji subset) |
| `public/v1/logo.svg`, `monogram.svg` | Logo and monogram |
| [DESIGN.md](DESIGN.md) | Website design language |
| [DESIGN-APP.md](DESIGN-APP.md) | App design language |

Use it:

```html
<link rel="stylesheet" href="https://design.anantf.com/v1/app.css">
```

Copied from `anantf-site` (`assets/app/`, `fonts/`, logos, design notes) on 23 Oct 2026; until that site loads the
kit from here, change both copies together. `/v1/` never breaks: a change that would break apps goes in `/v2/`.

Deploy: `npx wrangler deploy` (static files from `public/`, custom domain in `wrangler.jsonc`).
