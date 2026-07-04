# OrderStatus — Lab Consumption PWA

A mobile-first Progressive Web App for recording raw-material consumption on the shop floor. Built for a small essential-oil and handmade-product business that needs to log **what was used, for what purpose, and how much**—quickly, from a phone, without typing or searching.

**Airtable** holds master data (materials, suppliers, batches, consumption history). **Next.js** provides a touch-friendly capture UI and a thin API layer so the browser never talks to Airtable directly.

**Production:** https://order-status-jade.vercel.app

---

## What it does

### Log consumption (core flow)

A four-step, keyboard-free workflow:

1. **Pick a material** — favorites, recently used items, or browse by category / `material_group` (no search box).
2. **Choose usage type** — one of eight categories (see table below).
3. **Set quantity** — integer steppers and quick-amount buttons tuned per material.
4. **Review & submit** — confirm and send to Airtable; undo the last entry if you made a mistake.

Drafts survive navigation within a session. Recent materials are remembered locally for faster repeat entries.

**Usage types** (Airtable `usage_type` single-select values):

| API value | Meaning |
|-----------|---------|
| `custom` | Custom order |
| `finished_product` | Finished product |
| `corporate_client` | Corporate client |
| `brand_sponsorship` | Brand sponsorship / gift |
| `rd_lab` | R&D |
| `workshop` | Workshop |
| `raw_repack` | Raw material repack |
| `product_sample` | Product sample |

### View consumption summary

The **Summary** (`/summary`) page loads consumption logs from Airtable and shows totals for today, this week, or this month. Filter by usage type, material group, or a specific material. Group results as a flat list or roll up by material, usage, or day.

### Manage materials (lightweight)

**Add material** (`/materials/new`):

- Pick **`material_group`** only (31 fixed groups — 精油、瓶子、产品纸盒包装…). No separate category picker; App derives Airtable `category` on save.
- Optional CSV template (bottle / packaging rows in `airtable/seeds/materials_packaging.csv`), filtered by selected `material_group`.
- Supplier dropdown from `suppliers.csv`; writes to Airtable Materials + Suppliers link.

Browse the full catalog on `/materials` and `/pick` (still grouped by Airtable `category` tabs).

### Authentication

Shared passcode login with a long-lived signed session cookie. Rate-limited login endpoint; logout clears the session. Production uses a bcrypt hash—never a plaintext passcode in environment variables.

---

## Architecture

| Layer | Role |
|-------|------|
| **Next.js (App Router)** | PWA UI, Route Handlers, session auth |
| **Airtable** | Materials, suppliers, batches, consumption logs |
| **Vercel** | Hosting (environment variables hold secrets) |

Data flows: **Phone → Next.js API → Airtable**. The Airtable Personal Access Token stays server-side only.

The App **auto-resolves Airtable field API names** (case-insensitive, UTF-8 BOM prefix from CSV import). You should still fix polluted field names in Airtable when possible — see [`airtable/FIX-CONSUMPTION.txt`](airtable/FIX-CONSUMPTION.txt).

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
| `AIRTABLE_MATERIALS_TABLE` | Yes | Materials table name or ID (case-insensitive match) |
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
node scripts/test-material-create.mjs      # optional: smoke-test material POST
node scripts/test-consumption-create.mjs   # optional: smoke-test consumption POST
node scripts/debug-consumption-logs.mjs    # optional: list logs + formula debug
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
| `POST` | `/api/materials` | Yes | Create material (derives `category` from `material_group`) |
| `GET` | `/api/material-templates` | Yes | CSV templates + suppliers (`?category=` optional; default all) |
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
| `/materials/new` | Add a new material (`material_group` → auto `category`) |

---

## Airtable setup

Schema definitions, seed CSVs, and import instructions live under [`airtable/`](airtable/).

| Doc | When to read |
|-----|----------------|
| [`airtable/README.md`](airtable/README.md) | Table layout, CSV import |
| [`airtable/IMPORT-FRESH.txt`](airtable/IMPORT-FRESH.txt) | Rebuild base from seeds (101 EO + packaging) |
| [`airtable/ADD-CONSUMPTION-LOGS-FIELDS.txt`](airtable/ADD-CONSUMPTION-LOGS-FIELDS.txt) | Consumption_logs field checklist |
| [`airtable/FIX-CONSUMPTION.txt`](airtable/FIX-CONSUMPTION.txt) | Submit / display failures after CSV import |
| [`airtable/SETUP.txt`](airtable/SETUP.txt) | PAT + Base ID for `.env.local` |
| [`lib/material-groups.ts`](lib/material-groups.ts) | 31 `material_group` options + category mapping |
| [`lib/consumption-types.ts`](lib/consumption-types.ts) | 8 `usage_type` slugs |

For product requirements and field-level design, see [request.md](request.md) and [plan-airtable.md](plan-airtable.md).

### Recent behavior (2026-07)

- **Add material:** category UI removed; only `material_group` dropdown. `category` written automatically (e.g. 瓶子 → `bottle`, 精油 → `ingredient`).
- **Default unit:** new ingredient-like groups default to **`ml`** (matches `materials.csv` seed).
- **CSV BOM fields:** if primary column API names become `name` / `material` with a hidden prefix after import, App resolves them on read/write; fix in Airtable when convenient.
- **`occurred_at`:** if Airtable column is Date-only (no time), App writes `YYYY-MM-DD`; Date with time accepts full ISO.

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
