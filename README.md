# Quiet Stack Studios Website

Static website for [quietstackstudios.com](https://quietstackstudios.com) — deployed via GitHub Pages.

## Structure

- `index.html` — Homepage
- `apps/` — Individual app pages (Flint, Verdant Garden)
- `assets/` — Images, logos, and walkthrough screenshots
- `css/styles.css` — Global stylesheet
- `js/main.js` — Scroll animations and interactivity
- `backend/` — Express server (Stripe payments, Flint Card inventory)
- `scripts/` — Utilities (QR code generation)

## Running the Backend

```bash
cd backend
npm install
node server.js
```

Requires a `.env` file with `STRIPE_SECRET_KEY`, `DATABASE_URL`, and `STRIPE_WEBHOOK_SECRET`.
