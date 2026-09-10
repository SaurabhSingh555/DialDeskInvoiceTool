import { useEffect, useMemo, useRef, useState } from "react";
import { Search, RefreshCw, Building2, Check } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { toast } from "sonner";

// Searchable client dropdown with autocomplete, live from DialDesk CRM.
export default function ClientSelect({ value, onChange }) {
  const { clients, clientsLoading, loadClients } = useApp();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, query]);

  const refresh = async () => {
    const list = await loadClients(true);
    toast.success(`Synced ${list.length} clients from CRM`);
  };

  return (
    <div className="relative" ref={boxRef}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="input flex items-center justify-between text-left"
        >
          <span className="flex items-center gap-2 truncate">
            <Building2 size={16} className="text-brand-500" />
            {value ? (
              <span className="text-slate-800">{value.name}</span>
            ) : (
              <span className="text-slate-400">Search client...</span>
            )}
          </span>
        </button>
        <button
          type="button"
          onClick={refresh}
          className="btn-secondary shrink-0"
          title="Refresh clients"
        >
          <RefreshCw size={16} className={clientsLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {open && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type client name..."
              className="w-full text-sm outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {clientsLoading && (
              <div className="px-3 py-6 text-center text-sm text-slate-400">Loading clients...</div>
            )}
            {!clientsLoading && filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-slate-400">
                No clients found. Try Refresh.
              </div>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50"
              >
                <span className="flex items-center gap-2">
                  <Building2 size={15} className="text-slate-400" />
                  {c.name}
                </span>
                {value?.id === c.id && <Check size={15} className="text-brand-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
