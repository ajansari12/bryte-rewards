# Bryte Rewards

Employee recognition platform built for Canadian teams — warm editorial design, multi-industry support, and a full-featured demo shell.

## What it is

Bryte Rewards is a prototype SaaS application for peer-to-peer and manager-led employee recognition. It ships with a complete UI demo covering the full product surface: recognition wall, leaderboards, badges, rewards catalogue, team-pulse dashboards, analytics, and an admin panel. The demo is seeded with mock data that swaps automatically when you change the industry pack.

## Screens and route map

| Screen | AppContext `screen` | Description |
|---|---|---|
| Login | `login` | Split-panel sign-in form |
| Sign up | `signup` | Org registration form |
| Onboarding | `onboarding` | 4-step industry / values wizard |
| App shell | `app` | Main authenticated experience |

Inside the app shell, the `route` state controls the active page:

| Route | Description |
|---|---|
| `feed` | Recognition wall (masonry, live updates) |
| `profile` | Current user profile + sent/received history |
| `notifications` | Notification centre |
| `leaderboard` | Points rankings |
| `badges` | Badge catalogue + nomination flow |
| `rewards` | Rewards marketplace |
| `manager` | Team-pulse view for managers |
| `analytics` | Charts and engagement metrics |
| `admin` | Admin controls and bulk actions |
| `mobile` | iOS / Android mobile preview |

## Tech stack

| Layer | Technology |
|---|---|
| Bundler | Vite 6 |
| UI | React 19 + TypeScript |
| Routing | React Router 7 (`createBrowserRouter`) |
| Server state | TanStack Query 5 |
| Database | Supabase (Bolt Cloud, `@supabase/supabase-js`) |
| Styling | Custom CSS design system (`src/styles/globals.css`) |
| Fonts | Fraunces · Plus Jakarta Sans · DM Mono (Google Fonts) |
| Testing | Vitest 2 + React Testing Library + jsdom |
| CI | GitHub Actions (Node 20) |

## npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server at `http://localhost:3000` |
| `npm run build` | Type-check then produce a production `dist/` |
| `npm run preview` | Serve the last production build locally |
| `npm test` | Run the unit test suite once |

## Environment variables

Copy `.env.example` to `.env` and fill in the values. Bolt injects `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` automatically for Vite projects.

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
RESEND_API_KEY=          # server-side Edge Functions only
STRIPE_SECRET_KEY=       # server-side only
STRIPE_WEBHOOK_SECRET=   # server-side only
SENTRY_DSN=              # safe to expose client-side
```
