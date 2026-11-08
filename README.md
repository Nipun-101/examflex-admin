# ExamFlex Admin

Staff-only admin console for ExamFlex. Manage the question bank, catalog, mock papers, commerce, and related content. This is **not** the student test-taking app.

The UI talks to the **examflex-api** NestJS backend through a same-origin proxy (`/api/ezprep`). Admin sessions are JWT cookies verified with a shared `JWT_SECRET`.

## Stack

- **Next.js** 16 (App Router) + **React** 19 + **TypeScript**
- **Ant Design** for the admin shell and most screens
- **Tailwind CSS** + assorted UI primitives
- **Vitest** for unit/component tests
- **mathpix-markdown-it** for math/markdown rendering in questions

## Features

| Area | Routes |
|---|---|
| Dashboard | `/admin` |
| Users, products, orders, accounting, commerce health, feedback | `/admin/users`, `/products`, `/orders`, `/accounting`, `/commerce-health`, `/feedback` |
| Question bank & imports | `/admin/questions`, `/bulk-upload`, `/failed-questions` |
| Tests | `/admin/mock-tests` (topic-wise), `/full-mock-tests`, `/sprint-tests` |
| Current affairs | `/admin/current-affairs` |
| Catalog | `/admin/categories`, `/exam-groups`, `/exams`, `/subjects`, `/topics`, `/tags` |

More detail on how topic-wise mock tests are created and stored: [`docs/mock-test-creation.md`](docs/mock-test-creation.md).

## Prerequisites

- **Node.js** `>= 20.9.0`
- A running **ez-prep-api** instance (default local URL: `http://localhost:3000`)
- An admin user in that backend (login uses `POST /api/v1/auth/admin/login`)

## Local setup

1. **Clone and install**

   ```bash
   git clone git@github.com:Nipun-101/examflex-admin.git
   cd examflex-admin
   npm install
   ```

   This repo sets `legacy-peer-deps=true` in `.npmrc`, so installs should match CI/local expectations without extra flags.

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Fill in values:

   | Variable | Purpose |
   |---|---|
   | `JWT_SECRET` | Must match `JWT_SECRET` on ez-prep-api. Used by `proxy.ts` to verify the admin session JWT. |
   | `EZPREP_API_URL` | Backend origin. Local default: `http://localhost:3000` |
   | `EZPREP_API_PREFIX` | API path prefix. Local default: `/api` |
   | `PORT` | Optional; scripts pin the Next app to **3002**. |
   | `NEXT_PUBLIC_API_URL` | Optional public API URL hint from the example env file. Browser calls go through `/api/ezprep` on this app. |

   AWS credentials stay on ez-prep-api only — do not put them in this app’s `.env`.

3. **Start the API** (separate repo)

   Ensure ez-prep-api is listening on the URL configured above, with the same `JWT_SECRET`.

4. **Run the admin app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3002](http://localhost:3002) and sign in at `/login` with an admin account.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Next.js dev server on port **3002** |
| `npm run build` | Production build |
| `npm start` | Serve the production build on port **3002** |
| `npm run lint` | ESLint |
| `npm test` | Vitest (single run) |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Vitest with coverage |

## Architecture notes

- **Auth**: `/api/auth/login` proxies credentials to ez-prep-api, then stores the access token in an httpOnly cookie (`ezprep_admin_session`). `proxy.ts` guards pages and APIs; unauthenticated users are redirected to `/login`.
- **API proxy**: Authenticated browser requests hit `/api/ezprep/*`, which forwards to `${EZPREP_API_URL}${EZPREP_API_PREFIX}/*` with the session token. Allowed v1 roots are enforced in `app/api/ezprep/[...path]/route.ts`.
- **Branding**: Instance name/logo come from the backend `instance-config` endpoint and are applied in the admin layout.

## Project layout

```
app/
  admin/           # Admin UI pages
  api/             # Auth + EzPrep proxy routes
  services/        # EzPrep API clients
  login/           # Sign-in page
components/        # Shared UI
lib/               # Session helpers and utilities
docs/              # Module documentation
proxy.ts           # Request auth gate (Next proxy/middleware)
```

## Troubleshooting

- **Immediate redirect to `/login`**: `JWT_SECRET` is missing or does not match the backend, or the session cookie is invalid/expired.
- **API errors after login**: Confirm `EZPREP_API_URL` / `EZPREP_API_PREFIX` point at a healthy ez-prep-api, and that the signed-in user has `role: "admin"`.
- **Port conflicts**: Dev/start scripts use **3002**. Change the `-p` flag in `package.json` if needed.
