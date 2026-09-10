import axios from "axios";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

// Central Axios instance for all backend calls.
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

// ------------------------- CRM -------------------------
export const crmApi = {
  clients: (refresh = false) =>
    api.get("/crm/clients", { params: { refresh } }).then((r) => r.data),
  login: () => api.post("/crm/login").then((r) => r.data),
  getSettings: () => api.get("/crm/settings").then((r) => r.data),
  saveSettings: (payload) => api.post("/crm/settings", payload).then((r) => r.data),
  sync: () => api.post("/crm/sync").then((r) => r.data),
};

// ------------------------- SMTP -------------------------
export const smtpApi = {
  get: () => api.get("/smtp/config").then((r) => r.data),
  save: (payload) => api.post("/smtp/save", payload).then((r) => r.data),
  test: (payload) => api.post("/smtp/test", payload).then((r) => r.data),
};

// ------------------------- CC -------------------------
export const ccApi = {
  list: () => api.get("/cc").then((r) => r.data),
  add: (payload) => api.post("/cc", payload).then((r) => r.data),
  toggle: (id, payload) => api.put(`/cc/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/cc/${id}`).then((r) => r.data),
};

// ------------------------- Templates -------------------------
export const templateApi = {
  list: () => api.get("/templates").then((r) => r.data),
  byClient: (clientId) => api.get(`/templates/by-client/${clientId}`).then((r) => r.data),
  save: (payload) => api.post("/templates", payload).then((r) => r.data),
  update: (id, payload) => api.put(`/templates/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/templates/${id}`).then((r) => r.data),
};

// ------------------------- Invoice -------------------------
export const invoiceApi = {
  upload: (clientName, file, onProgress) => {
    const form = new FormData();
    form.append("client_name", clientName);
    form.append("file", file);
    return api
      .post("/invoice/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      })
      .then((r) => r.data);
  },
  signedUrl: (path) =>
    api.get("/invoice/signed-url", { params: { path } }).then((r) => r.data),
  send: (payload) => api.post("/invoice/send", payload).then((r) => r.data),
  history: (params) => api.get("/invoice/history", { params }).then((r) => r.data),
  get: (id) => api.get(`/invoice/${id}`).then((r) => r.data),
  resend: (id) => api.post(`/invoice/resend/${id}`).then((r) => r.data),
  remove: (id) => api.delete(`/invoice/${id}`).then((r) => r.data),
};

// ------------------------- Dashboard -------------------------
export const dashboardApi = {
  stats: () => api.get("/dashboard/stats").then((r) => r.data),
  recent: () => api.get("/dashboard/recent").then((r) => r.data),
  status: () => api.get("/dashboard/status").then((r) => r.data),
};
