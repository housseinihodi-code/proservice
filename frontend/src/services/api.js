import axios from "axios";
import { useAuthStore } from "../store/authStore";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");

/** Adresse complète d'un fichier envoyé (photo de profil…) : en production, l'API n'est pas sur le même domaine que le site. */
export const mediaUrl = (url) => (url && url.startsWith("/uploads/") ? `${API_URL}${url}` : url);

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refresh_token: refreshToken });
          useAuthStore.getState().setToken(data.access_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        }
      } catch {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  register: (data) => api.post("/api/auth/register", data),
  login: (data) => api.post("/api/auth/login", data),
  refresh: (token) => api.post("/api/auth/refresh", { refresh_token: token }),
};

export const usersAPI = {
  getMe: () => api.get("/api/users/me"),
  updateMe: (data) => api.put("/api/users/me", data),
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post("/api/users/me/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } });
  },
  changePassword: (data) => api.put("/api/users/me/password", data),
  getUser: (id) => api.get(`/api/users/${id}`),
};

export const professionalsAPI = {
  list: (params) => api.get("/api/professionals", { params }),
  getById: (id) => api.get(`/api/professionals/${id}`),
  getByUserId: (userId) => api.get(`/api/professionals/user/${userId}`),
  updateMyProfile: (data) => api.put("/api/professionals/me", data),
};

export const offersAPI = {
  list: (params) => api.get("/api/offers", { params }),
  create: (data) => api.post("/api/offers", data),
  getById: (id) => api.get(`/api/offers/${id}`),
  update: (id, data) => api.put(`/api/offers/${id}`, data),
  delete: (id) => api.delete(`/api/offers/${id}`),
  apply: (id, data) => api.post(`/api/offers/${id}/apply`, data),
  getApplications: (id) => api.get(`/api/offers/${id}/applications`),
  acceptApplication: (offerId, applicationId) => api.post(`/api/offers/${offerId}/applications/${applicationId}/accept`),
  rejectApplication: (offerId, applicationId) => api.post(`/api/offers/${offerId}/applications/${applicationId}/reject`),
  mine: (params) => api.get("/api/offers/mine", { params }),
  myApplications: () => api.get("/api/offers/applications/me"),
};

export const tradesAPI = {
  list: (params) => api.get("/api/trades/", { params }),
};

export const missionsAPI = {
  list: (params) => api.get("/api/missions", { params }),
  create: (data) => api.post("/api/missions", data),
  getById: (id) => api.get(`/api/missions/${id}`),
  update: (id, data) => api.put(`/api/missions/${id}`, data),
  accept: (id) => api.post(`/api/missions/${id}/accept`),
  validateDeliverable: (id, data) => api.post(`/api/missions/${id}/validate-deliverable`, data),
  cancel: (id) => api.post(`/api/missions/${id}/cancel`),
  decline: (id) => api.post(`/api/missions/${id}/decline`),
  deliver: (id, data) => api.post(`/api/missions/${id}/deliver`, data),
  dispute: (id, data) => api.post(`/api/missions/${id}/dispute`, data),
};

export const messagesAPI = {
  getConversations: () => api.get("/api/messages/conversations"),
  getConversation: (userId, params) => api.get(`/api/messages/with/${userId}`, { params }),
  send: (data) => api.post("/api/messages", data),
  getUnreadCount: () => api.get("/api/messages/unread-count"),
};

export const evaluationsAPI = {
  create: (data) => api.post("/api/evaluations", data),
  getUserEvaluations: (userId, params) => api.get(`/api/evaluations/user/${userId}`, { params }),
  respond: (id, data) => api.put(`/api/evaluations/${id}/respond`, data),
  flag: (id, data) => api.post(`/api/evaluations/${id}/flag`, data),
};

export const transactionsAPI = {
  initiate: (data) => api.post("/api/transactions/initiate", data),
  list: (params) => api.get("/api/transactions", { params }),
  getById: (id) => api.get(`/api/transactions/${id}`),
};

export const documentsAPI = {
  upload: (formData) => api.post("/api/documents", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  myDocuments: () => api.get("/api/documents/my"),
  delete: (id) => api.delete(`/api/documents/${id}`),
  validate: (id, data) => api.put(`/api/documents/${id}/validate`, data),
  file: (id) => api.get(`/api/documents/${id}/file`, { responseType: "blob" }),
};

// Ouvre un document privé dans un nouvel onglet (le fichier est téléchargé avec le jeton de connexion).
export async function openPrivateDocument(id) {
  const tab = window.open("", "_blank");
  try {
    const { data } = await documentsAPI.file(id);
    const url = URL.createObjectURL(data);
    if (tab) tab.location.href = url; else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    tab?.close();
    throw e;
  }
}

export const walletAPI = {
  getMine: () => api.get("/api/wallet/me"),
  getTransactions: (params) => api.get("/api/wallet/transactions", { params }),
  topup: (data) => api.post("/api/wallet/topup", data),
  transfer: (data) => api.post("/api/wallet/transfer", data),
};

export const adminAPI = {
  getDashboard: () => api.get("/api/admin/dashboard"),
  listUsers: (params) => api.get("/api/admin/users", { params }),
  getUser: (id) => api.get(`/api/admin/users/${id}`),
  toggleUserActive: (id) => api.put(`/api/admin/users/${id}/toggle-active`),
  toggleUserVerified: (id) => api.put(`/api/admin/users/${id}/verify`),
  changeUserRole: (id, role) => api.put(`/api/admin/users/${id}/role`, null, { params: { role } }),
  getPendingDocuments: () => api.get("/api/admin/documents/pending"),
  listProfessionals: (params) => api.get("/api/admin/professionals", { params }),
  toggleFeatured: (id) => api.put(`/api/admin/professionals/${id}/featured`),
  listMissions: (params) => api.get("/api/admin/missions", { params }),
  getDisputedMissions: () => api.get("/api/admin/missions/disputed"),
  resolveDispute: (id, favorClient) => api.post(`/api/admin/missions/${id}/resolve-dispute`, null, { params: { favor_client: favorClient } }),
  listOffers: (params) => api.get("/api/admin/offers", { params }),
  closeOffer: (id) => api.post(`/api/admin/offers/${id}/close`),
  getFlaggedEvaluations: () => api.get("/api/admin/evaluations/flagged"),
  moderateEvaluation: (id, hide) => api.post(`/api/admin/evaluations/${id}/moderate`, null, { params: { hide } }),
  listTrades: () => api.get("/api/admin/trades/"),
  createTrade: (data) => api.post("/api/admin/trades/", data),
  updateTrade: (id, data) => api.put(`/api/admin/trades/${id}`, data),
  deleteTrade: (id) => api.delete(`/api/admin/trades/${id}`),
  listTeam: () => api.get("/api/admin/team"),
  addTeamMember: (data) => api.post("/api/admin/team", data),
  getLogs: (params) => api.get("/api/admin/logs", { params }),
  listContact: (params) => api.get("/api/admin/contact/", { params }),
  toggleContactHandled: (id) => api.put(`/api/admin/contact/${id}/handled`),
};

export const contactAPI = {
  send: (data) => api.post("/api/contact/", data),
};
