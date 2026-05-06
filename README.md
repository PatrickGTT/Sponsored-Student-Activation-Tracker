# Sponsored Student Activation Tracker (MVP)

Internal tool for a CDL training company to track agency- and company-sponsored
students who carry AR balances but may not have started class. The goal is to
prevent sponsored students from slipping through the cracks, drive start-date
confirmation, and make agency AR more collectible.

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## What's in the MVP

- **Dashboard** with summary cards: total sponsored students, count of high-risk
  records, count with no scheduled start date, and total open AR exposure.
- **Filters** for OSS owner, location, agency, risk level, and lifecycle status.
- **Sortable-feeling table** of students with key fields: name, agency, OSS /
  location, lifecycle status, scheduled start, AR balance, risk badge, last
  contact, next follow-up, and last-updated relative time.
- **Edit drawer** (click any row) for status, scheduled start, actual start,
  last contact date + result, next follow-up date, AR balance, and notes. Saves
  stamp `updatedAt` automatically. Setting status to `Rescheduled` increments
  the reschedule counter.
- **Risk flag logic** in `src/utils/risk.js`. High = unreachable, withdrew with
  AR, multiple reschedules, AR > $5k with no actual start, or several softer
  signals stacked. See `calculateRisk` for the rules.
- **Priority This Week** view that surfaces every student who is High risk,
  has a follow-up due within 7 days, or is scheduled to start within 7 days —
  with a "Why priority" column explaining the reason.

## Tech

- React 18 + Vite
- TailwindCSS
- In-memory mock data in `src/data/students.js` (no backend, no auth)

Edits live for the duration of the session — refreshing the page resets the
data. That's deliberate for the MVP.

## File map

```
src/
  App.jsx                  state container, view switching, save handler
  main.jsx                 React entry
  index.css                Tailwind base
  data/students.js         mock students, lifecycle + contact result enums
  utils/risk.js            risk + priority logic (pure functions)
  utils/format.js          date / money / relative-time formatters
  components/
    Header.jsx             title + dashboard / priority tabs
    StatsCards.jsx         four summary cards
    FilterBar.jsx          OSS / location / agency / risk / lifecycle dropdowns
    StudentTable.jsx       row table; click row to open drawer
    StudentDrawer.jsx      edit panel, dirty-state save button
    Badge.jsx              risk + status pill components
```

## Next steps (post-MVP)

- Persistence (localStorage, then a real backend).
- Auth + per-user OSS scoping.
- Audit log of edits per student.
- CSV export of the priority list for weekly standups.
- Editable agency contact info.
