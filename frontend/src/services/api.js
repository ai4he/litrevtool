import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  googleLogin: (token) => api.post('/auth/google', { token }),
  getCurrentUser: () => api.get('/auth/me'),
};

// Search Jobs API
export const jobsAPI = {
  createJob: (data) => api.post('/jobs/', data),
  listJobs: (skip = 0, limit = 100) => api.get('/jobs/', { params: { skip, limit } }),
  getJob: (jobId) => api.get(`/jobs/${jobId}`),
  updateJob: (jobId, data) => api.patch(`/jobs/${jobId}`, data),
  deleteJob: (jobId) => api.delete(`/jobs/${jobId}`),
  pauseJob: (jobId) => api.post(`/jobs/${jobId}/pause`),
  resumeJob: (jobId) => api.post(`/jobs/${jobId}/resume`),
  getPapers: (jobId, skip = 0, limit = 50) => api.get(`/jobs/${jobId}/papers`, { params: { skip, limit } }),
  downloadResults: (jobId) => {
    return axios({
      url: `${API_URL}/api/v1/jobs/${jobId}/download`,
      method: 'GET',
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
  },
  downloadPrismaDiagram: (jobId) => {
    return axios({
      url: `${API_URL}/api/v1/jobs/${jobId}/prisma-diagram`,
      method: 'GET',
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
  },
  downloadLatex: (jobId) => {
    return axios({
      url: `${API_URL}/api/v1/jobs/${jobId}/latex`,
      method: 'GET',
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
  },
  downloadBibtex: (jobId) => {
    return axios({
      url: `${API_URL}/api/v1/jobs/${jobId}/bibtex`,
      method: 'GET',
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
  },
  getScreenshot: (jobId) => {
    return `${API_URL}/api/v1/jobs/${jobId}/screenshot?t=${Date.now()}`;
  },
};

export default api;
