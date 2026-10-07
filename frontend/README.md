# Signal — Frontend for `email-service` (v2: full redesign)

A React (Vite + Tailwind + Recharts) frontend rebuilt to match the reference
dashboard design, wired to your real `email-service` backend. Nothing in the
backend was changed — and this version was built against your actual current
backend code (which has grown since the first pass: it now has campaign
scheduling/cancelling and a real spam-check endpoint).

## Running it

Same as before:

```bash
# backend
cd email-service && npm install && node server.js   # localhost:3000

# frontend
cd frontend && npm install && npm run dev            # localhost:5173
```

`vite.config.js` proxies `/api/*` to `localhost:3000`, so no CORS changes
are needed on the backend.

## What's new in this pass

- **Sidebar** now has a "Tools" section: **AI Assistant** and **Spam Risk
  Analyzer**, both real pages backed by real endpoints.
- **Topbar** (search / notification bell / avatar) on every page.
- **Campaign scheduling** — your backend gained `schedule` / `cancel` /
  `reschedule` endpoints since the first version; the campaign card menu and
  detail page now use them.
- Charts and sparklines throughout (Dashboard, Subscribers, Campaigns,
  Analytics), all built from **real data**, explained below.

## Being straight about what's real, derived, or unavailable

The reference screenshots show a few things your backend doesn't literally
store. Rather than fake numbers, here's exactly what each one actually is:

| UI element | What it really is |
|---|---|
| Subscriber "Added on" date, growth chart | The `Subscriber` schema has no `timestamps: true`, so there's no `createdAt`. Instead, the frontend decodes the real creation time embedded in MongoDB's `_id` (`utils/objectId.js`) — genuine data, just read from an unconventional place. |
| Stat card sparklines & "+X% from last 7 days" | Computed client-side from real timestamps (`utils/trend.js`) — actual week-over-week counts, not simulated. |
| Activity Timeline | Built from real events only (`utils/activity.js`): subscriber creation (via the `_id` trick above, clustering same-second batches into one "CSV imported" event), campaign creation/sent/scheduled/cancelled (via real `createdAt`/`sentAt`/`updatedAt`). There's no event for "subscriber unsubscribed/bounced" because that schema has no field recording *when* status changed — so it's genuinely unknown, and I didn't invent a timestamp for it. |
| Campaign "Sent" count, Delivery rate, Open rate | **Not tracked server-side at all** — `sendCampaign` loops over active subscribers and never persists who/how many/whether it succeeded. For sent campaigns the card shows your *current* active-subscriber count, clearly as an approximation (it'll drift as your list changes); delivery/open rate show `—`, matching the same convention the reference design already uses for drafts. |
| Spam Risk "Risk Breakdown" chart | Your `/api/ai/spam-check` returns raw signals (`promotionalWords`, `linkCount`, etc.) but not per-category points. Since I read `spam.service.js` and know its exact scoring weights, `utils/spamBreakdown.js` reconstructs the real point contribution per category — it's arithmetic on numbers the API actually returned, not a guess. |
| Spam issue "High/Medium/Low" tags | The API returns plain issue strings with no severity field. Severity here is inferred from which rule produced the issue (again, based on the real weights), not returned by the server — flagged in case you want to add real severity server-side later. |
| AI Assistant "Recent Generations" | Stored in `localStorage`, not the backend — genuinely your past generations in *this browser*, just not persisted anywhere else. Said explicitly in the UI. |
| AI Assistant "Improve Text" / "Get Suggestions" cards | There's only one generation endpoint (`/api/ai/generate`), so these route through the same "Generate Email" flow rather than being separate capabilities — the quick-link cards reflect that (only "Generate Email" and "Check Spam Risk" are wired; the others are visual parity with the reference for now). |
| "AI Score: Unavailable" / "AI Analysis: Not available" | This isn't a frontend fallback — it's literally what `checkSpamRisk` returns when the Gemini call fails server-side (`aiAvailable: false`). The reference screenshot shows this exact state, so it renders correctly either way. |

## Two small backend things (still not changed)

1. `src/middlewares/upload.middleware.js`: `file.originialName` → should be
   `file.originalname`.
2. No CORS middleware in `src/app.js` — fine for local dev via the Vite
   proxy, matters once frontend/backend are on different origins in
   production.

## Note on the earlier FRONTEND_WALKTHROUGH.md

That file-by-file doc was written for the first, simpler version of this
frontend. This redesign added/changed enough files that it's now out of
date — happy to regenerate it if useful.
