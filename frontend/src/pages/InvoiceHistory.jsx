import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Eye,
  Download,
  RefreshCw,
  Trash2,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import Layout from "../components/Layout.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { invoiceApi } from "../services/api";
import { useApp } from "../context/AppContext.jsx";

const PAGE_SIZE = 10;

export default function InvoiceHistory() {
  const { clients } = useApp();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await invoiceApi.history({
        q: q || undefined,
        client_id: clientId || undefined,
        status: status || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setItems(d.items || []);
      setTotal(d.total || 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q, clientId, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const fmtDate = (d) => (d ? format(new Date(d), "dd MMM yyyy") : "-");
  const fmtTime = (d) => (d ? format(new Date(d), "HH:mm") : "-");

  const preview = async (row) => {
    try {
      const d = await invoiceApi.signedUrl(row.storage_path);
      if (d.url) window.open(d.url, "_blank");
      else toast.error("No file available");
    } catch {
      toast.error("Could not open file");
    }
  };

  const resend = async (row) => {
    try {
      await invoiceApi.resend(row.id);
      toast.success("Invoice resent");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Resend failed");
    }
  };

  const remove = async (row) => {
    if (!confirm("Delete this invoice record?")) return;
    try {
      await invoiceApi.remove(row.id);
      toast.success("Deleted");
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  const exportData = async (type) => {
    const all = await invoiceApi.history({ page: 1, page_size: 1000 });
    const rows = (all.items || []).map((r) => ({
      Invoice: r.invoice_name,
      Client: r.client_name,
      "Sent To": r.sent_to,
      CC: r.cc,
      Subject: r.subject,
      Status: r.status,
      Date: fmtDate(r.created_at),
      Time: fmtTime(r.created_at),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    const stamp = format(new Date(), "yyyy_MM_dd");
    if (type === "csv") {
      XLSX.writeFile(wb, `DialDesk_Invoice_Report_${stamp}.csv`, { bookType: "csv" });
    } else {
      XLSX.writeFile(wb, `DialDesk_Invoice_Report_${stamp}.xlsx`);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Layout title="Invoice History">
      <div className="card">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="Search invoice, client, email…"
              className="input py-1.5 pl-8"
            />
          </div>
          <select
            className="input max-w-[180px] py-1.5"
            value={clientId}
            onChange={(e) => {
              setPage(1);
              setClientId(e.target.value);
            }}
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="input max-w-[150px] py-1.5"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">All Status</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="retrying">Retrying</option>
          </select>
          <button className="btn-secondary" onClick={() => exportData("csv")}>
            <FileText size={15} /> CSV
          </button>
          <button className="btn-secondary" onClick={() => exportData("xlsx")}>
            <FileSpreadsheet size={15} /> Excel
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-14 text-center text-sm text-slate-400">Loading…</div>
          ) : items.length === 0 ? (
            <EmptyState title="No invoices found" description="Try adjusting filters or send a new invoice." />
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Sent To</th>
                  <th className="px-4 py-3">CC</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.invoice_name}</td>
                    <td className="px-4 py-3 text-slate-600">{r.client_name}</td>
                    <td className="px-4 py-3 text-slate-600">{r.sent_to}</td>
                    <td className="px-4 py-3 text-slate-500">{(r.cc || "").split(",").filter(Boolean).length}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtTime(r.created_at)}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button className="btn-secondary px-2 py-1" title="Preview" onClick={() => preview(r)}>
                          <Eye size={15} />
                        </button>
                        <button className="btn-secondary px-2 py-1" title="Download" onClick={() => preview(r)}>
                          <Download size={15} />
                        </button>
                        <button className="btn-secondary px-2 py-1" title="Resend" onClick={() => resend(r)}>
                          <RefreshCw size={15} />
                        </button>
                        <button className="btn-danger px-2 py-1" title="Delete" onClick={() => remove(r)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 p-4 text-sm text-slate-500">
          <span>
            {total} record{total === 1 ? "" : "s"} · Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button className="btn-secondary px-2 py-1" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft size={16} />
            </button>
            <button className="btn-secondary px-2 py-1" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
