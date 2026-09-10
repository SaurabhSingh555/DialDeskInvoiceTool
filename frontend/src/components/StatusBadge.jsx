import { CheckCircle2, XCircle, RefreshCw, Clock } from "lucide-react";

// Coloured status badge for invoice history / dashboard.
const MAP = {
  sent: { cls: "bg-emerald-50 text-emerald-700", Icon: CheckCircle2, label: "Sent" },
  failed: { cls: "bg-red-50 text-red-700", Icon: XCircle, label: "Failed" },
  retrying: { cls: "bg-amber-50 text-amber-700", Icon: RefreshCw, label: "Retrying" },
  pending: { cls: "bg-slate-100 text-slate-600", Icon: Clock, label: "Pending" },
};

export default function StatusBadge({ status }) {
  const cfg = MAP[status] || MAP.pending;
  const { Icon } = cfg;
  return (
    <span className={`badge gap-1 ${cfg.cls}`}>
      <Icon size={13} />
      {cfg.label}
    </span>
  );
}
