import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('zynora_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
};

export const chatAPI = {
  sendQuery: (message, conversationId = null) => api.post('/zynora/chat', { message, conversationId })
};

export const conversationAPI = {
  getAll: () => api.get('/zynora/conversations'),
  getById: (id) => api.get(`/zynora/conversations/${id}`),
  create: (title = 'New Conversation') => api.post('/zynora/conversations', { title }),
  rename: (id, title) => api.patch(`/zynora/conversations/${id}`, { title }),
  delete: (id) => api.delete(`/zynora/conversations/${id}`),
  clear: (id) => api.post(`/zynora/conversations/${id}/clear`)
};

export const knowledgeAPI = {
  getDocuments: (params) => api.get('/knowledge', { params }),
  getDocument: (id) => api.get(`/knowledge/${id}`),
  createDocument: (data) => api.post('/knowledge', data),
  updateDocument: (id, data) => api.put(`/knowledge/${id}`, data),
  approveDocument: (id) => api.post(`/knowledge/${id}/approve`),
  activateDocument: (id) => api.post(`/knowledge/${id}/activate`),
  archiveDocument: (id) => api.post(`/knowledge/${id}/archive`),
  ingestAll: () => api.post('/knowledge/ingest/all')
};

export const adminAPI = {
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getStats: () => api.get('/admin/stats'),
  getMonitoringOverview: (params) => api.get('/admin/monitoring/overview', { params }),
  getMonitoringQuestions: (params) => api.get('/admin/monitoring/questions', { params }),
  getMonitoringErrors: (params) => api.get('/admin/monitoring/errors', { params }),
  getMonitoringHealth: () => api.get('/admin/monitoring/health')
};

export default api;
