import { useEffect, useState } from "react";
import { Zap, Database, Server, Mail, Cloud, HardDrive } from "lucide-react";
import Layout from "../components/Layout.jsx";
import { dashboardApi } from "../services/api";

function StatusRow({ Icon, label, ok, detail }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
      <span className="flex items-center gap-2 text-sm text-slate-700">
        <Icon size={16} className="text-brand-600" /> {label}
      </span>
      <span className={`badge ${ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
        {ok ? "Connected" : "Not Connected"}
        {detail ? ` · ${detail}` : ""}
      </span>
    </div>
  );
}

export default function About() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    dashboardApi.status().then(setStatus).catch(() => setStatus(null));
  }, []);

  const mb = status?.storage_bytes ? (status.storage_bytes / 1024 / 1024).toFixed(2) : "0.00";

  return (
    <Layout title="About">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Zap size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">DialDesk Invoice Automation Portal</h2>
              <p className="text-sm text-slate-500">Version 1.0.0</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-600">
            Built for the <strong>DialDesk Operations Team</strong> to automate daily invoice delivery.
            Select a client from the live CRM, upload the invoice PDF, preview the exact email, and send —
            everything else (storage, CC, logging, retries) happens automatically.
          </p>
          <div className="mt-4 rounded-lg bg-slate-50 p-4 text-xs text-slate-500">
            Stack: React 19 + Vite · FastAPI · Supabase (PostgreSQL + Storage) · SMTP
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-800">System Status</h2>
          <div className="space-y-3">
            <StatusRow Icon={Server} label="Backend (FastAPI)" ok={status?.backend} />
            <StatusRow Icon={Database} label="Supabase" ok={status?.supabase} />
            <StatusRow Icon={Mail} label="SMTP" ok={status?.smtp} />
            <StatusRow Icon={Cloud} label="CRM" ok={status?.crm?.connected} detail={status?.crm ? `${status.crm.clients_cached} clients` : ""} />
            <div className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-slate-700">
                <HardDrive size={16} className="text-brand-600" /> Storage Usage
              </span>
              <span className="badge bg-brand-50 text-brand-700">{mb} MB</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
