import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Send,
  History,
  Settings,
  Info,
  Zap,
} from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", Icon: LayoutDashboard, end: true },
  { to: "/send", label: "Send Invoice", Icon: Send },
  { to: "/history", label: "Invoice History", Icon: History },
  { to: "/configuration", label: "Configuration", Icon: Settings },
  { to: "/about", label: "About", Icon: Info },
];

export default function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Zap size={18} />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-slate-900">DialDesk</p>
          <p className="text-xs text-slate-500">Invoice Portal</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-4 text-xs text-slate-400">v1.0.0 • Operations Team</div>
    </aside>
  );
}
