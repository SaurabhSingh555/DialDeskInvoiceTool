import { useEffect, useState } from "react";
import {
  Server,
  Mail,
  FileEdit,
  Database,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import Layout from "../components/Layout.jsx";
import ClientSelect from "../components/ClientSelect.jsx";
import { smtpApi, ccApi, templateApi, crmApi } from "../services/api";

const TABS = [
  { key: "smtp", label: "SMTP", Icon: Server },
  { key: "cc", label: "CC Emails", Icon: Mail },
  { key: "template", label: "Client Templates", Icon: FileEdit },
  { key: "crm", label: "CRM", Icon: Database },
];

const VARIABLES = [
  "{{client_name}}",
  "{{month}}",
  "{{year}}",
  "{{invoice_name}}",
  "{{invoice_date}}",
  "{{sender_name}}",
  "{{company_name}}",
];

export default function Configuration() {
  const [tab, setTab] = useState("smtp");
  return (
    <Layout title="Configuration">
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`btn ${tab === key ? "bg-brand-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>
      {tab === "smtp" && <SmtpSection />}
      {tab === "cc" && <CcSection />}
      {tab === "template" && <TemplateSection variables={VARIABLES} />}
      {tab === "crm" && <CrmSection />}
    </Layout>
  );
}

/* ------------------------ SECTION A: SMTP ------------------------ */
function SmtpSection() {
  const [form, setForm] = useState({
    smtp_host: "",
    smtp_port: 587,
    username: "",
    password: "",
    sender_email: "",
    sender_name: "DialDesk Operations",
    tls_enabled: true,
    ssl_enabled: false,
  });
  const [testState, setTestState] = useState(null); // "ok" | "fail" | "loading"
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    smtpApi.get().then((d) => {
      if (d.configured) setForm((f) => ({ ...f, ...d, password: "" }));
    });
  }, []);

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await smtpApi.save(form);
      toast.success("SMTP configuration saved");
    } catch {
      toast.error("Failed to save SMTP");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTestState("loading");
    try {
      const r = await smtpApi.test(form);
      setTestState(r.ok ? "ok" : "fail");
      r.ok ? toast.success("SMTP connected") : toast.error(r.message || "Connection failed");
    } catch (e) {
      setTestState("fail");
      toast.error(e?.response?.data?.detail || "Connection failed");
    }
  };

  return (
    <div className="card max-w-3xl p-6">
      <h2 className="mb-4 text-base font-semibold text-slate-800">SMTP Configuration</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="SMTP Host" value={form.smtp_host} onChange={(v) => upd("smtp_host", v)} placeholder="smtp.gmail.com" />
        <Field label="SMTP Port" type="number" value={form.smtp_port} onChange={(v) => upd("smtp_port", Number(v))} />
        <Field label="SMTP Username" value={form.username} onChange={(v) => upd("username", v)} />
        <Field label="SMTP Password" type="password" value={form.password} onChange={(v) => upd("password", v)} placeholder="•••••••• (leave blank to keep)" />
        <Field label="Sender Email" value={form.sender_email} onChange={(v) => upd("sender_email", v)} />
        <Field label="Sender Name" value={form.sender_name} onChange={(v) => upd("sender_name", v)} />
      </div>
      <div className="mt-4 flex gap-6">
        <Toggle label="TLS" checked={form.tls_enabled} onChange={(v) => upd("tls_enabled", v)} />
        <Toggle label="SSL" checked={form.ssl_enabled} onChange={(v) => upd("ssl_enabled", v)} />
      </div>
      <div className="mt-6 flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save SMTP
        </button>
        <button className="btn-secondary" onClick={test}>
          {testState === "loading" ? <Loader2 size={16} className="animate-spin" /> : <Server size={16} />} Test Connection
        </button>
        {testState === "ok" && <span className="badge gap-1 bg-emerald-50 text-emerald-700"><CheckCircle2 size={13} /> Connected</span>}
        {testState === "fail" && <span className="badge gap-1 bg-red-50 text-red-700"><XCircle size={13} /> Failed</span>}
      </div>
    </div>
  );
}

/* ------------------------ SECTION B: CC ------------------------ */
function CcSection() {
  const [list, setList] = useState([]);
  const [email, setEmail] = useState("");

  const load = () => ccApi.list().then((d) => setList(d.cc || []));
  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!email) return;
    try {
      await ccApi.add({ email, enabled: true });
      setEmail("");
      load();
      toast.success("CC added");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    }
  };

  const toggle = async (item) => {
    await ccApi.toggle(item.id, { email: item.email, enabled: !item.enabled });
    load();
  };

  const remove = async (id) => {
    await ccApi.remove(id);
    load();
  };

  return (
    <div className="card max-w-2xl p-6">
      <h2 className="mb-1 text-base font-semibold text-slate-800">CC Configuration</h2>
      <p className="mb-4 text-sm text-slate-500">Every invoice is automatically CC'd to enabled emails.</p>
      <div className="flex gap-2">
        <input className="input" placeholder="accounts@dialdesk.in" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button className="btn-primary shrink-0" onClick={add}>
          <Plus size={16} /> Add
        </button>
      </div>
      <ul className="mt-4 divide-y divide-slate-100">
        {list.length === 0 && <li className="py-4 text-sm text-slate-400">No CC emails yet.</li>}
        {list.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-3">
            <span className="text-sm text-slate-700">{c.email}</span>
            <div className="flex items-center gap-3">
              <Toggle label={c.enabled ? "Enabled" : "Disabled"} checked={c.enabled} onChange={() => toggle(c)} />
              <button className="btn-danger px-2 py-1" onClick={() => remove(c.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------ SECTION C: Client Templates ------------------ */
function TemplateSection({ variables }) {
  const [client, setClient] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!client) return;
    templateApi.byClient(client.id).then((d) => {
      setForm(
        d.template || {
          client_id: client.id,
          client_name: client.name,
          client_email: "",
          subject_template: "Invoice for {{client_name}} — {{month}} {{year}}",
          email_template:
            "Dear Team,\n\nPlease find attached the invoice for {{month}} {{year}}.\n\nInvoice Name: {{invoice_name}}\n\nThanks & Regards",
          signature: "{{sender_name}}\n{{company_name}}",
          cc_override: "",
        }
      );
    });
  }, [client]);

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const insertVar = (field, v) => setForm((f) => ({ ...f, [field]: (f[field] || "") + " " + v }));

  const save = async () => {
    setSaving(true);
    try {
      await templateApi.save({ ...form, client_id: client.id, client_name: client.name });
      toast.success("Template saved");
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="card p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-800">Client Email Template</h2>
        <label className="label">Select Client (live from CRM)</label>
        <ClientSelect value={client} onChange={setClient} />

        {form && (
          <div className="mt-5 space-y-4">
            <Field label="Client Email" value={form.client_email} onChange={(v) => upd("client_email", v)} />
            <Field label="CC Override (comma separated)" value={form.cc_override} onChange={(v) => upd("cc_override", v)} />

            <div>
              <label className="label">Subject Template</label>
              <input className="input" value={form.subject_template} onChange={(e) => upd("subject_template", e.target.value)} />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="label mb-0">Email Template</label>
                <select className="input max-w-[180px] py-1 text-xs" onChange={(e) => e.target.value && insertVar("email_template", e.target.value)} value="">
                  <option value="">Insert variable…</option>
                  {variables.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <textarea className="input min-h-[160px] font-mono text-sm" value={form.email_template} onChange={(e) => upd("email_template", e.target.value)} />
            </div>

            <div>
              <label className="label">Signature</label>
              <textarea className="input min-h-[80px] font-mono text-sm" value={form.signature} onChange={(e) => upd("signature", e.target.value)} />
            </div>

            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Template
            </button>
          </div>
        )}
      </div>

      {/* Live preview */}
      <div className="card p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-800">Live Preview</h2>
        {!form ? (
          <p className="text-sm text-slate-400">Select a client to preview the email template.</p>
        ) : (
          <div className="rounded-xl border border-slate-200 p-4 text-sm">
            <p className="text-xs text-slate-400">Subject</p>
            <p className="mb-3 font-medium text-slate-800">{renderPreview(form.subject_template, client)}</p>
            <p className="text-xs text-slate-400">Body</p>
            <pre className="whitespace-pre-wrap font-sans text-slate-700">{renderPreview(form.email_template, client)}</pre>
            <div className="mt-3 border-t border-slate-100 pt-3">
              <pre className="whitespace-pre-wrap font-sans text-slate-600">{renderPreview(form.signature, client)}</pre>
            </div>
          </div>
        )}
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-slate-500">Supported variables</p>
          <div className="flex flex-wrap gap-1.5">
            {variables.map((v) => (
              <span key={v} className="badge bg-brand-50 text-brand-700">{v}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderPreview(text, client) {
  const now = new Date();
  const ctx = {
    client_name: client?.name || "Client",
    month: now.toLocaleString("en-US", { month: "long" }),
    year: String(now.getFullYear()),
    invoice_name: "September_Invoice.pdf",
    invoice_date: now.toLocaleDateString("en-GB"),
    sender_name: "DialDesk Operations",
    company_name: "DialDesk",
  };
  let out = text || "";
  Object.entries(ctx).forEach(([k, v]) => {
    out = out.split(`{{${k}}}`).join(v).split(`{${k}}`).join(v);
  });
  return out;
}

/* ------------------------ SECTION D: CRM ------------------------ */
function CrmSection() {
  const [form, setForm] = useState({ crm_email: "", crm_password: "", auto_sync: true });
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    crmApi.getSettings().then((d) => {
      setForm((f) => ({ ...f, crm_email: d.crm_email || "", auto_sync: d.auto_sync }));
      setLastSync(d.last_sync);
    });
  }, []);

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    try {
      await crmApi.saveSettings(form);
      toast.success("CRM settings saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  const refreshToken = async () => {
    try {
      await crmApi.login();
      toast.success("CRM token refreshed");
    } catch {
      toast.error("Token refresh failed");
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const d = await crmApi.sync();
      setLastSync(d.last_sync);
      toast.success(`Synced ${d.count} clients`);
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="card max-w-2xl p-6">
      <h2 className="mb-1 text-base font-semibold text-slate-800">CRM Configuration</h2>
      <p className="mb-4 text-sm text-slate-500">Credentials used to fetch clients live from DialDesk CRM.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="CRM Email" value={form.crm_email} onChange={(v) => upd("crm_email", v)} />
        <Field label="CRM Password" type="password" value={form.crm_password} onChange={(v) => upd("crm_password", v)} placeholder="••••••••" />
      </div>
      <div className="mt-4">
        <Toggle label="Auto Sync (every 30 min)" checked={form.auto_sync} onChange={(v) => upd("auto_sync", v)} />
      </div>
      <p className="mt-3 text-xs text-slate-400">Last Sync: {lastSync || "Never"}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button className="btn-primary" onClick={save}><Save size={16} /> Save</button>
        <button className="btn-secondary" onClick={refreshToken}><RefreshCw size={16} /> Refresh Token</button>
        <button className="btn-secondary" onClick={sync} disabled={syncing}>
          {syncing ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />} Sync Clients
        </button>
      </div>
    </div>
  );
}

/* ------------------------ Shared inputs ------------------------ */
function Field({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} className="input" value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-brand-600" : "bg-slate-300"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
      {label}
    </label>
  );
}
