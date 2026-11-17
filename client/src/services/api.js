import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('gc_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('gc_token');
        localStorage.removeItem('gc_admin');
        localStorage.removeItem('ag_current_user');
        localStorage.removeItem('ag_company');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  demoLogin: () => api.post('/auth/demo-login'),
  registerCompany: (data) => api.post('/auth/register-company', data),
  validateInvitation: (token) => api.get(`/auth/invitations/${token}`),
  acceptInvitation: (data) => api.post('/auth/accept-invitation', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const dashboardAPI = {
  getOverview: () => api.get('/dashboard/overview'),
  getAnalytics: () => api.get('/dashboard/analytics'),
};

export const guardsAPI = {
  getAll: (params) => api.get('/guards', { params }),
  getById: (id) => api.get(`/guards/${id}`),
  create: (data) => api.post('/guards', data),
  update: (id, data) => api.put(`/guards/${id}`, data),
  delete: (id) => api.delete(`/guards/${id}`),
  getAttendance: (id) => api.get(`/guards/${id}/attendance`),
  getCallLogs: (id) => api.get(`/guards/${id}/call-logs`),
  getShifts: (id) => api.get(`/guards/${id}/shifts`),
};

export const sitesAPI = {
  getAll: () => api.get('/sites'),
  create: (data) => api.post('/sites', data),
  update: (id, data) => api.put(`/sites/${id}`, data),
  delete: (id) => api.delete(`/sites/${id}`),
};

export const supervisorsAPI = {
  getAll: () => api.get('/supervisors'),
  create: (data) => api.post('/supervisors', data),
  update: (id, data) => api.put(`/supervisors/${id}`, data),
  delete: (id) => api.delete(`/supervisors/${id}`),
};

export const shiftsAPI = {
  getAll: () => api.get('/shifts'),
  create: (data) => api.post('/shifts', data),
  update: (id, data) => api.put(`/shifts/${id}`, data),
  delete: (id) => api.delete(`/shifts/${id}`),
};

export const callsAPI = {
  initiate: (data) => api.post('/calls/initiate', data),
  getHistory: (params) => api.get('/calls/history', { params }),
  simulateDtmf: (data) => api.post('/calls/simulate-dtmf', data),
};

export const attendanceAPI = {
  getAttendance: (params) => api.get('/attendance', { params }),
  getReports: (params) => api.get('/attendance/reports', { params }),
};

export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const companyAPI = {
  createInvitation: (data) => api.post('/company/invitations', data),
  getInvitations: () => api.get('/company/invitations'),
  revokeInvitation: (id) => api.delete(`/company/invitations/${id}`),
  getMembers: () => api.get('/company/members'),
  createMember: (data) => api.post('/company/members', data),
  updateMember: (id, data) => api.put(`/company/members/${id}`, data),
  toggleMemberStatus: (id) => api.patch(`/company/members/${id}/status`),
  resetMemberPassword: (id, data) => api.post(`/company/members/${id}/reset-password`, data),
};

export const platformAPI = {
  getOverview: () => api.get('/company/platform/overview'),
  getCompanies: () => api.get('/company/platform/companies'),
  getCompany: (id) => api.get(`/company/platform/companies/${id}`),
  createCompany: (data) => api.post('/company/platform/companies', data),
  updateCompany: (id, data) => api.put(`/company/platform/companies/${id}`, data),
  updateStatus: (id, status) => api.patch(`/company/platform/companies/${id}/status`, { status }),
  manageOwner: (id, data) => api.post(`/company/platform/companies/${id}/owner`, data),
  resetCompanyPassword: (id, data) => api.post(`/company/platform/companies/${id}/reset-password`, data),
  getAdmins: () => api.get('/company/platform/admins'),
  createAdmin: (data) => api.post('/company/platform/admins', data),
  toggleAdminStatus: (id) => api.patch(`/company/platform/admins/${id}/status`),
  resetAdminPassword: (id) => api.post(`/company/platform/admins/${id}/reset-password`),
};

export const settingsAPI = {
  getSettings: () => api.get('/settings'),
  updateSettings: (data) => api.put('/settings', data),
  updateAdminProfile: (data) => api.put('/settings/admin-profile', data),
};

export default api;
