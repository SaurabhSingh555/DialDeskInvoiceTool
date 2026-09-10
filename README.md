# DialDesk Invoice Automation Portal

Production-ready invoice automation tool for the DialDesk Operations team.

- **Frontend:** React 19 + Vite + JSX (no TypeScript), TailwindCSS, Axios, React Router DOM, React-PDF, Lucide, Sonner toasts
- **Backend:** Python FastAPI, Supabase Python SDK, APScheduler, Aiosmtplib, Cryptography, Pydantic
- **Database + Storage:** Supabase (PostgreSQL + Storage bucket `invoices`)
- **No login / no signup / no auth.** Opens directly to the Dashboard.

> Note: This repository also contains a small Next.js `/api/health` stub used only by the
> hosting sandbox's healthcheck. **The real application is entirely under `frontend/`,
> `backend/`, and `supabase/`.** Ignore the root Next.js files when running locally.

---

## 1. Supabase Setup (no local database needed)

1. Create a project at <https://supabase.com>.
2. Open **SQL Editor → New query**, paste the entire contents of
   [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
   This creates all tables, indexes, triggers, disables RLS, and registers the
   `invoices` storage bucket + policies.
3. Go to **Storage** and confirm a **private** bucket named `invoices` exists
   (the SQL registers it; if it isn't visible, create it manually: name `invoices`, Public = OFF).
4. Grab your keys from **Project Settings → API**:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` secret → `SUPABASE_SERVICE_KEY` (backend only!)
   - `anon` public key → `VITE_SUPABASE_ANON_KEY` (frontend)

---

## 2. Backend (FastAPI) — Windows

```bat
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `backend\.env`:

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOi...        (service_role key)
CRM_EMAIL=ispark@dialdesk.in
CRM_PASSWORD=1234
JWT_SECRET=any-long-random-string
```

Run it:

```bat
uvicorn app:app --reload --port 8000
```

API docs: <http://localhost:8000/docs> · Health: <http://localhost:8000/health>

---

## 3. Frontend (React + Vite) — Windows

```bat
cd frontend
npm install
copy .env.example .env
```

Edit `frontend\.env`:

```
VITE_BACKEND_URL=http://localhost:8000
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...      (anon key)
```

Run it:

```bat
npm run dev
```

Open <http://localhost:5173>.

---

## 4. First-run checklist

1. **Configuration → SMTP:** enter host/port/username/password, Save, then **Test Connection**.
2. **Configuration → CC:** add `accounts@dialdesk.in`, `ops@dialdesk.in`, etc.
3. **Configuration → Client Templates:** pick a client (fetched live from CRM), set subject/body/signature.
4. **Send Invoice:** choose client → drag & drop the PDF → review email → **Send Invoice**.
5. **Invoice History:** search, filter, resend, download, delete, export CSV/Excel.

---

## Features

- Live CRM client fetch (`/auth/login` + `/agents/clients-rights`) with in-memory token cache,
  auto refresh on 401, and a background scheduler that re-syncs every 30 minutes.
- PDF upload to Supabase Storage (`invoices/{year}/{Month}/{Client}/file.pdf`), 24h signed URLs.
- HTML email with PDF attachment, global + per-client CC, 3-retry SMTP send, full logging.
- Encrypted SMTP password at rest (Fernet key derived from `JWT_SECRET`).
- Dashboard analytics, animated counters, activity timeline, search.
- Template variables: `{{client_name}}`, `{{month}}`, `{{year}}`, `{{invoice_name}}`,
  `{{invoice_date}}`, `{{sender_name}}`, `{{company_name}}`.

---

## Project structure

```
frontend/    React 19 + Vite + JSX app
backend/     FastAPI app (routes/ services/ models/ scheduler.py utils.py)
supabase/    schema.sql (paste into Supabase SQL Editor)
```
