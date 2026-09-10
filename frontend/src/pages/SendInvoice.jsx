import { useCallback, useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  RefreshCw,
  Send,
  Loader2,
  X,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import Layout from "../components/Layout.jsx";
import ClientSelect from "../components/ClientSelect.jsx";
import PdfPreview from "../components/PdfPreview.jsx";
import { invoiceApi, templateApi, ccApi } from "../services/api";

const MAX = 20 * 1024 * 1024;

function renderVars(text, ctx) {
  if (!text) return "";
  let out = text;
  Object.entries(ctx).forEach(([k, v]) => {
    out = out.split(`{{${k}}}`).join(v || "").split(`{${k}}`).join(v || "");
  });
  return out;
}

export default function SendInvoice() {
  const [client, setClient] = useState(null);
  const [file, setFile] = useState(null);
  const [localUrl, setLocalUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploaded, setUploaded] = useState(null); // {storage_path, storage_url}
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [to, setTo] = useState("");
  const [cc, setCc] = useState([]);
  const [template, setTemplate] = useState(null);

  // Load global CC list once
  useEffect(() => {
    ccApi.list().then((d) => {
      setCc((d.cc || []).filter((c) => c.enabled).map((c) => c.email));
    });
  }, []);

  const buildContext = useCallback(
    (invoiceName) => {
      const now = new Date();
      return {
        client_name: client?.name || "",
        month: now.toLocaleString("en-US", { month: "long" }),
        year: String(now.getFullYear()),
        invoice_name: invoiceName || file?.name || "",
        invoice_date: now.toLocaleDateString("en-GB"),
        sender_name: "DialDesk Operations",
        company_name: "DialDesk",
      };
    },
    [client, file]
  );

  // When client changes -> load its template & apply
  useEffect(() => {
    if (!client) return;
    templateApi.byClient(client.id).then((d) => {
      const t = d.template;
      setTemplate(t);
      const ctx = buildContext(file?.name);
      if (t) {
        setSubject(renderVars(t.subject_template, ctx));
        setBody(
          renderVars(t.email_template, ctx) +
            (t.signature ? `\n\n${renderVars(t.signature, ctx)}` : "")
        );
        setTo(t.client_email || "");
        if (t.cc_override) {
          setCc((prev) => Array.from(new Set([...prev, ...t.cc_override.split(",").map((x) => x.trim()).filter(Boolean)])));
        }
      } else {
        setSubject(renderVars("Invoice for {{client_name}} — {{month}} {{year}}", ctx));
        setBody(
          renderVars(
            "Dear Team,\n\nPlease find attached the invoice for {{month}} {{year}}.\n\nInvoice Name: {{invoice_name}}\n\nThanks & Regards\n{{sender_name}}",
            ctx
          )
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const handleFile = async (f) => {
    if (!f) return;
    if (f.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }
    if (f.size > MAX) {
      toast.error("File exceeds 20MB limit");
      return;
    }
    setFile(f);
    setLocalUrl(URL.createObjectURL(f));
    setUploaded(null);
    setProgress(0);

    setUploading(true);
    try {
      const res = await invoiceApi.upload(client?.name || "General", f, setProgress);
      setUploaded(res);
      toast.success("Invoice uploaded to Supabase Storage");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const replaceInvoice = () => {
    setFile(null);
    setLocalUrl("");
    setUploaded(null);
    setProgress(0);
    inputRef.current?.click();
  };

  const send = async () => {
    if (!client) return toast.error("Select a client first");
    if (!uploaded) return toast.error("Upload an invoice PDF first");
    if (!to) return toast.error("Recipient email is required");
    if (!subject) return toast.error("Subject is required");

    setSending(true);
    try {
      await invoiceApi.send({
        client_id: client.id,
        client_name: client.name,
        invoice_name: file?.name || "invoice.pdf",
        storage_path: uploaded.storage_path,
        sent_to: to,
        cc,
        subject,
        email_body: body.replace(/\n/g, "<br/>"),
      });
      toast.success("Invoice sent successfully 🎉");
      // reset
      setFile(null);
      setLocalUrl("");
      setUploaded(null);
      setProgress(0);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to send invoice");
    } finally {
      setSending(false);
    }
  };

  const prettySize = file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "";

  return (
    <Layout title="Send Invoice">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* LEFT */}
        <div className="space-y-6">
          <div className="card p-5">
            <label className="label">Step 1 · Select Client (live from CRM)</label>
            <ClientSelect value={client} onChange={setClient} />
          </div>

          <div className="card p-5">
            <label className="label">Step 2 · Upload Invoice PDF</label>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {!file ? (
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition ${
                  dragOver ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-brand-400"
                }`}
              >
                <UploadCloud size={34} className="text-brand-500" />
                <p className="text-sm font-medium text-slate-700">Drag &amp; drop your invoice here</p>
                <p className="text-xs text-slate-400">PDF only · Max 20MB · Single file</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText size={22} className="text-brand-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{file.name}</p>
                      <p className="text-xs text-slate-400">{prettySize}</p>
                    </div>
                  </div>
                  <button onClick={replaceInvoice} className="btn-secondary px-2 py-1" title="Replace">
                    <RefreshCw size={15} />
                  </button>
                </div>
                {uploading && (
                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Uploading… {progress}%</p>
                  </div>
                )}
                {uploaded && !uploading && (
                  <p className="mt-2 text-xs font-medium text-emerald-600">✓ Stored in Supabase</p>
                )}
              </div>
            )}
          </div>

          <div className="card p-5">
            <label className="label">Step 3 · Invoice Preview</label>
            <PdfPreview fileUrl={uploaded?.storage_url || localUrl} fileName={file?.name} />
          </div>
        </div>

        {/* RIGHT — Email preview */}
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Mail size={16} className="text-brand-600" /> Step 4 · Email Preview (editable)
            </h2>

            <div className="space-y-4">
              <div>
                <label className="label">To</label>
                <input className="input" value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@example.com" />
              </div>

              <div>
                <label className="label">CC ({cc.length})</label>
                <div className="flex flex-wrap gap-2">
                  {cc.length === 0 && <span className="text-xs text-slate-400">No CC configured</span>}
                  {cc.map((email) => (
                    <span key={email} className="badge gap-1 bg-slate-100 text-slate-600">
                      {email}
                      <button onClick={() => setCc((p) => p.filter((x) => x !== email))}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Subject</label>
                <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>

              <div>
                <label className="label">Body</label>
                <textarea
                  className="input min-h-[220px] font-mono text-sm leading-relaxed"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>

              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                Attachment: <span className="font-medium text-slate-700">{file?.name || "— none —"}</span>
              </div>
            </div>

            <button onClick={send} disabled={sending} className="btn-primary mt-5 w-full py-3">
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {sending ? "Sending…" : "Send Invoice"}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
