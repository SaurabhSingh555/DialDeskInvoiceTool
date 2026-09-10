import { useApp } from "../context/AppContext.jsx";
import { Wifi, WifiOff, Users } from "lucide-react";

// Top bar showing SMTP status + live client count.
export default function Topbar({ title }) {
  const { status, clients } = useApp();
  const smtpOk = status?.smtp;

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="badge gap-1 bg-brand-50 text-brand-700">
          <Users size={13} /> {clients.length} clients
        </span>
        {smtpOk ? (
          <span className="badge gap-1 bg-emerald-50 text-emerald-700">
            <Wifi size={13} /> SMTP Connected
          </span>
        ) : (
          <span className="badge gap-1 bg-red-50 text-red-700">
            <WifiOff size={13} /> SMTP Not Set
          </span>
        )}
      </div>
    </header>
  );
}
