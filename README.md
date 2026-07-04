# OrderStatus — Lab Consumption PWA

A mobile-first Progressive Web App for recording raw-material consumption on the shop floor. Built for a small essential-oil and handmade-product business that needs to log **what was used, for what purpose, and how much**—quickly, from a phone, without typing or searching.

**Airtable** holds master data (materials, suppliers, batches, consumption history). **Next.js** provides a touch-friendly capture UI and a thin API layer so the browser never talks to Airtable directly.

---

## What it does

### Log consumption (core flow)

A four-step, keyboard-free workflow:

1. **Pick a material** — favorites, recently used items, or browse by category/group (no search box).
2. **Choose usage type** — R&D / Lab, Product, Marketing, or Workshop.
3. **Set quantity** — integer steppers and quick-amount buttons tuned per material.
4. **Review & submit** — confirm and send to Airtable; undo the last entry if you made a mistake.

Drafts survive navigation within a session. Recent materials are remembered locally for faster repeat entries.

### View consumption summary

The **Summary** page loads consumption logs from Airtable and shows totals for today, this week, or this month. Filter by usage type, material group, or a specific material. Group results as a flat list or roll up by material, usage, or day. Line totals use batch pricing when available.

### Manage materials (lightweight)

Add new materials from the phone with category-specific fields (ingredients, bottles, labels, packaging, etc.), supplier, and price. Browse the full catalog on the materials explorer page.

### Authentication

Shared passcode login with a long-lived signed session cookie. Rate-limited login endpoint; logout clears the session. Production uses a bcrypt hash—never a plaintext passcode in environment variables.

---

## Architecture

| Layer | Role |
|-------|------|
| **Next.js (App Router)** | PWA UI, Route Handlers, session auth |
| **Airtable** | Materials, suppliers, batches, consumption logs, attachments |
| **Vercel** | Hosting (environment variables hold secrets) |

Data flows: **Phone → Next.js API → Airtable**. The Airtable Personal Access Token stays server-side only.

---

## Tech stack

- Next.js 15, React 19, TypeScript, Tailwind CSS
- Airtable REST API (server-side)
- `jose` for signed sessions, `bcryptjs` for passcode hashing
- Lucide icons, Web App Manifest (installable PWA)

---

## Getting started

### 1. Install dependencies

```bash
npm install
npm run icons   # generate PWA icons
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | Yes | Random string, ≥ 32 characters |
| `APP_PASSCODE_HASH` | Production | Bcrypt hash of the shared passcode |
| `APP_PASSCODE` | Local dev only | Plain passcode when hash is unset and `NODE_ENV` ≠ production |
| `AIRTABLE_PAT` | Yes | Airtable Personal Access Token (server only) |
| `AIRTABLE_BASE_ID` | Yes | Airtable base ID |
| `AIRTABLE_MATERIALS_TABLE` | Yes | Materials table name or ID |
| `AIRTABLE_CONSUMPTION_TABLE` | Yes | Consumption logs table name or ID |
| `IDEMPOTENCY_LOOKUP_DAYS` | No | Idempotency window for duplicate submissions (default **30**) |

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Generate a passcode hash:

```bash
node -e "const b=require('bcryptjs'); console.log(b.hashSync('YOUR_PASSCODE', 12))"
```

Validate your setup:

```bash
npm run check-env
npm run diagnose-airtable
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), log in, and start logging consumption.

### 4. Production build

```bash
npm run build && npm run start
```

Deploy notes: see [DEPLOY.txt](DEPLOY.txt). Use `npm run vercel-env` to print env values for the Vercel dashboard.

---

## API routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/health` | No | Health check |
| `POST` | `/api/login` | No | Passcode login (rate-limited) |
| `POST` | `/api/logout` | Yes | End session |
| `GET` | `/api/materials` | Yes | Active materials list |
| `GET` | `/api/material-templates` | Yes | Category-specific form templates |
| `POST` | `/api/consumption` | Yes | Submit a consumption log (idempotent) |
| `PATCH` | `/api/consumption/[id]/void` | Yes | Void / undo a log entry |
| `GET` | `/api/consumption/logs` | Yes | Query logs for the summary view |

---

## App routes

| Path | Purpose |
|------|---------|
| `/login` | Passcode entry |
| `/` | Home — favorites, recents, category shortcuts |
| `/pick` | Material picker |
| `/usage` | Usage type selection |
| `/quantity` | Quantity stepper |
| `/review` | Confirm and submit |
| `/summary` | Consumption totals and filters |
| `/materials` | Browse all materials |
| `/materials/new` | Add a new material |

---

## Airtable setup

Schema definitions, seed CSVs, and import instructions live under [`airtable/`](airtable/). See [`airtable/README.md`](airtable/README.md) for table layout and seed data.

For product requirements and field-level design, see [request.md](request.md) and [plan-airtable.md](plan-airtable.md).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run icons` | Regenerate PWA icons |
| `npm run check-env` | Validate required env vars |
| `npm run diagnose-airtable` | Test Airtable connectivity |
| `npm run vercel-env` | Print env hints for Vercel |

---

## Security notes

- Never commit `.env.local` (already in `.gitignore`).
- Use `APP_PASSCODE_HASH` in production, not `APP_PASSCODE`.
- Airtable credentials are server-only; verify they do not appear in client bundles or network responses from the browser.

---

## License

Private project.
