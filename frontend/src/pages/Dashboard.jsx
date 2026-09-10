import { useEffect, useMemo, useState } from "react";
import {
  Send,
  CalendarDays,
  AlertTriangle,
  Users,
  Search,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
import Layout from "../components/Layout.jsx";
import StatCard from "../components/StatCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { dashboardApi } from "../services/api";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    dashboardApi.stats().then(setStats).catch(() => setStats(null));
    dashboardApi.recent().then((d) => setRecent(d.items || [])).catch(() => setRecent([]));
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return recent;
    return recent.filter(
      (r) =>
        r.client_name?.toLowerCase().includes(s) ||
        r.invoice_name?.toLowerCase().includes(s) ||
        r.sent_to?.toLowerCase().includes(s)
    );
  }, [recent, q]);

  const fmt = (d) => (d ? format(new Date(d), "dd MMM yyyy, HH:mm") : "-");

  return (
    <Layout title="Dashboard">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Sent Today" value={stats?.sent_today ?? 0} Icon={Send} gradient="bg-gradient-to-br from-brand-500 to-brand-700" />
        <StatCard title="Sent This Month" value={stats?.sent_month ?? 0} Icon={CalendarDays} gradient="bg-gradient-to-br from-indigo-500 to-indigo-700" />
        <StatCard title="Failed Emails" value={stats?.failed ?? 0} Icon={AlertTriangle} gradient="bg-gradient-to-br from-rose-500 to-rose-700" />
        <StatCard title="Total Clients" value={stats?.total_clients ?? 0} Icon={Users} gradient="bg-gradient-to-br from-emerald-500 to-emerald-700" />
        <StatCard
          title="SMTP Status"
          value={stats?.smtp_connected ? "Connected" : "Not Set"}
          Icon={Activity}
          gradient={stats?.smtp_connected ? "bg-gradient-to-br from-teal-500 to-teal-700" : "bg-gradient-to-br from-slate-400 to-slate-600"}
        />
      </div>

      {/* Recent activity timeline */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Activity size={16} className="text-brand-600" /> Recent Activity
          </h2>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-400">No activity yet.</p>
          ) : (
            <ol className="relative space-y-4 border-l border-slate-200 pl-4">
              {recent.slice(0, 6).map((r) => (
                <li key={r.id} className="relative">
                  <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-brand-500 ring-4 ring-brand-50" />
                  <p className="text-sm font-medium text-slate-800">{r.client_name}</p>
                  <p className="text-xs text-slate-500">{r.invoice_name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{fmt(r.created_at)}</p>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Recent invoices table */}
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h2 className="text-sm font-semibold text-slate-800">Recent Invoices</h2>
            <div className="relative">
              <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search history..."
                className="input py-1.5 pl-8 text-sm"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            {filtered.length === 0 ? (
              <EmptyState title="No invoices found" description="Sent invoices will appear here." />
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Client</th>
                    <th className="px-4 py-2.5">Invoice</th>
                    <th className="px-4 py-2.5">Sent To</th>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.slice(0, 10).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-800">{r.client_name}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.invoice_name}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.sent_to}</td>
                      <td className="px-4 py-2.5 text-slate-500">{fmt(r.created_at)}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
