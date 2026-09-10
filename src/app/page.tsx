export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <section className="mx-auto w-full max-w-3xl rounded-3xl bg-white p-10 shadow-[0_24px_60px_rgba(16,24,40,0.12)]">
        <p className="m-0 text-sm uppercase tracking-[0.08em] text-blue-600">
          DialDesk Operations
        </p>
        <h1 className="mt-4 text-[clamp(1.8rem,5vw,3rem)] font-semibold leading-[1.05] text-slate-950">
          DialDesk Invoice Automation Portal
        </h1>
        <p className="mt-4 text-base text-slate-700">
          The full application was generated with the requested stack —{" "}
          <strong>React 19 + Vite + JSX</strong> frontend,{" "}
          <strong>Python FastAPI</strong> backend, and{" "}
          <strong>Supabase</strong> (PostgreSQL + Storage). The source lives in
          the repository, not in this Next.js host page.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="font-semibold text-slate-900">frontend/</p>
            <p className="text-sm text-slate-600">React 19 + Vite + Tailwind</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="font-semibold text-slate-900">backend/</p>
            <p className="text-sm text-slate-600">FastAPI + Supabase SDK</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="font-semibold text-slate-900">supabase/schema.sql</p>
            <p className="text-sm text-slate-600">Paste into SQL Editor</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">Run locally (see README.md):</p>
          <pre className="mt-2 overflow-x-auto text-xs text-slate-700">
{`# Backend
cd backend && python -m venv .venv && .venv\\Scripts\\activate
pip install -r requirements.txt && uvicorn app:app --port 8000

# Frontend
cd frontend && npm install && npm run dev`}
          </pre>
        </div>
      </section>
    </main>
  );
}
