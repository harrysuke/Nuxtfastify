# Taskflow — Tasks & Notes

A small full-stack task and note manager with per-user accounts. The API is built with Fastify and SQLite; there are two interchangeable frontends: a primary [Nuxt 4](https://nuxt.com/) app and an alternative [React 19 + Vite](https://vite.dev/) client. Both use the same backend, session cookie, and REST API.

## What's inside

| Directory | Stack | Default URL | Purpose |
| --- | --- | --- | --- |
| `backend/` | Fastify 5, better-sqlite3, Drizzle ORM, TypeScript | `http://localhost:3001` | REST API, authentication, SQLite persistence |
| `frontend/` | Nuxt 4, Vue 3, TypeScript | `http://localhost:3000` | Main UI (Tasks, Notes, login/register) |
| `react/` | React 19, Vite 8, TypeScript | `http://localhost:5173` | Alternative UI using the same API |

Features:

- Register / log in / log out; passwords hashed with scrypt, sessions stored server-side in an HttpOnly cookie (7 days, `SameSite=Lax`).
- Tasks and notes are scoped to the signed-in user.
- Task UI: inline add/edit, toggle, two-step delete, filters, progress summary, optimistic updates.
- Notes UI: create, pin, edit, delete, filter, pinned-first ordering.
- Responsive styling with light/dark-friendly tokens and reduced-motion support.
- The frontend calls `/api/...` on its own origin; a Nuxt server route (or Vite dev proxy) forwards requests and cookies to Fastify.

## Prerequisites

- Node.js (a current LTS release) and npm.
- No external database or service is required — SQLite is a local file.

## Quick start (Nuxt frontend)

```bash
# From the repository root
npm install
npm install --prefix backend
npm install --prefix frontend

# Starts the API (:3001) and Nuxt (:3000) together
npm run dev
```

Open <http://localhost:3000> and register an account. The first registered user inherits any pre-authentication task/note rows that had no owner.

## Alternative React frontend

Keep the backend running (`npm run dev` from the root starts both backend and Nuxt, or run `npm install --prefix backend && npm run dev --prefix backend` for the API only), then:

```bash
npm install --prefix react
npm run dev --prefix react
```

Open <http://localhost:5173>. The Vite dev/preview server proxies `/api` to `http://localhost:3001`, so requests and the session cookie stay same-origin.

## Project scripts

| Location | Command | Description |
| --- | --- | --- |
| root | `npm run dev` | Run backend and Nuxt together via `concurrently` |
| `backend/` | `npm run dev` | API with `tsx watch` |
| `backend/` | `npx tsc --noEmit` | Type-check the API |
| `frontend/` | `npm run dev` / `build` / `preview` / `generate` | Nuxt development, production build, preview, static generation |
| `react/` | `npm run dev` / `build` / `preview` / `lint` | Vite development, build, preview, ESLint |

## Configuration

All settings are optional and have local-development defaults.

| Variable | Used by | Default | Purpose |
| --- | --- | --- | --- |
| `PORT` | backend | `3001` | API listen port |
| `CORS_ORIGIN` | backend | `http://localhost:3000` | Allowed origin for credentialed requests |
| `NODE_ENV` | backend | unset | `production` makes the session cookie `Secure` (HTTPS required) |
| `API_BASE` | Nuxt | `http://localhost:3001` | Backend target of the Nuxt `/api` proxy |

The React proxy target is defined in `react/vite.config.ts`; change it there if the backend runs on a different port.

## Database

- The backend creates `backend/task.db` on first start and adds `tasks`, `notes`, `users`, and `sessions` tables automatically.
- Tasks use raw SQL; notes use the Drizzle schema in `backend/src/db/schema.ts` (`drizzle-kit` config is in `backend/drizzle.config.ts`).
- `*.db` files are ignored by Git: they contain hashed passwords, session tokens, and user data. Do not commit them.
- To reset locally, stop the backend and delete `backend/task.db`.

## API

Public endpoints:

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | `{ "email": "...", "password": "..." }` | Creates account (password ≥ 8 chars), sets session cookie |
| `POST` | `/auth/login` | `{ "email": "...", "password": "..." }` | Sets session cookie |
| `POST` | `/auth/logout` | — | Deletes session, clears cookie |
| `GET` | `/auth/me` | — | Current user, or `401` |

These require the `session` cookie:

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| `GET` | `/tasks` | — | Current user's tasks |
| `POST` | `/tasks` | `{ "title": "..." }` | Create task (`201`) |
| `PUT` | `/tasks/:id` | `{ "title"?, "completed"? }` | Update task |
| `DELETE` | `/tasks/:id` | — | Delete task |
| `GET` | `/notes` | — | Current user's notes |
| `POST` | `/notes` | `{ "content": "..." }` | Create note (`201`) |
| `PUT` | `/notes/:id` | `{ "content"?, "pinned"? }` | Update note |
| `DELETE` | `/notes/:id` | — | Delete note |

Quick API check with a cookie jar:

```bash
curl -c cookies.txt -X POST http://localhost:3001/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"password123"}'

curl -b cookies.txt http://localhost:3001/tasks
```

Browser clients normally call these paths under `/api` (for example `/api/tasks`) and let the Nuxt/Vite proxy forward them to port 3001.

## Deployment notes

This is a local-development setup. Before exposing it publicly, set `CORS_ORIGIN` to your real frontend origin, run with `NODE_ENV=production` over HTTPS (for `Secure` cookies), and add operational safeguards such as rate limiting, email verification, and backups of the SQLite file. `frontend/README.md` and `react/README.md` are the original starter templates; this file is the project-level guide.
