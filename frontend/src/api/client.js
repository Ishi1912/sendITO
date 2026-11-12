import axios from "axios";

// The Express backend mounts everything under /api and listens on :3000.
// vite.config.js proxies /api -> http://localhost:3000 in dev.
const client = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("signal_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("signal_token");
      localStorage.removeItem("signal_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ---- auth ----
export const authApi = {
  register: (payload) => client.post("/auth/register", payload),
  login: (payload) => client.post("/auth/login", payload),
};

// ---- subscribers ----
export const subscriberApi = {
  list: () => client.get("/subscriber"),
  get: (id) => client.get(`/subscriber/${id}`),
  create: (payload) => client.post("/subscriber", payload),
  update: (id, payload) => client.put(`/subscriber/${id}`, payload),
  remove: (id) => client.delete(`/subscriber/${id}`),
  uploadCsv: (file) => {
    const form = new FormData();
    form.append("file", file);
    return client.post("/subscriber/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ---- campaigns ----
export const campaignApi = {
  list: () => client.get("/campaign"),
  get: (id) => client.get(`/campaign/${id}`),
  create: (payload) => client.post("/campaign", payload),
  update: (id, payload) => client.put(`/campaign/${id}`, payload),
  remove: (id) => client.delete(`/campaign/${id}`),
  send: (id) => client.post(`/campaign/${id}/send`),
  schedule: (id, scheduledAt) => client.post(`/campaign/${id}/schedule`, { scheduledAt }),
  cancel: (id) => client.post(`/campaign/${id}/cancel`),
  reschedule: (id, scheduledAt) => client.post(`/campaign/${id}/reschedule`, { scheduledAt }),
  uploadAttachments: (id, files) => {
    const form = new FormData();
    for (const file of files) form.append("attachments", file);
    return client.post(`/campaign/${id}/attachments`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  removeAttachment: (id, attachmentId) => client.delete(`/campaign/${id}/attachments/${attachmentId}`),
};

// ---- AI (backed by /api/ai/generate -> { subject, content }, and
// /api/ai/spam-check -> { score, risk, ruleScore, aiScore, aiAvailable, breakdown, issues, suggestions }) ----
export const aiApi = {
  generate: (prompt) => client.post("/ai/generate", { prompt }),
  insights: (metrics) => client.post("/ai/insights", { metrics }),
  uploadFiles: (files) => {
    const form = new FormData();
    for (const file of files) form.append("files", file);
    // Let the browser/Axios set the multipart boundary automatically.
    return client.post("/ai/files", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  removeFile: (filename) => client.delete(`/ai/files/${encodeURIComponent(filename)}`),
  spamCheck: (subject, content) => client.post("/ai/spam-check", { subject, content }),
};

export default client;
