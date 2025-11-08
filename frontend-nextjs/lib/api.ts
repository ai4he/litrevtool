import axios from 'axios';
import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  googleLogin: (token: string) => api.post('/auth/google', { token }),
  getCurrentUser: () => api.get('/auth/me'),
};

// Search Jobs API
export const jobsAPI = {
  createJob: (data: any) => api.post('/jobs/', data),
  listJobs: (skip = 0, limit = 100) => api.get('/jobs/', { params: { skip, limit } }),
  getJob: (jobId: number | string) => api.get(`/jobs/${jobId}`),
  updateJob: (jobId: number | string, data: any) => api.patch(`/jobs/${jobId}`, data),
  deleteJob: (jobId: number | string) => api.delete(`/jobs/${jobId}`),
  pauseJob: (jobId: number | string) => api.post(`/jobs/${jobId}/pause`),
  resumeJob: (jobId: number | string) => api.post(`/jobs/${jobId}/resume`),
  getPapers: (jobId: number | string, skip = 0, limit = 50) =>
    api.get(`/jobs/${jobId}/papers`, { params: { skip, limit } }),
  downloadResults: (jobId: number | string) => {
    return axios({
      url: `${API_URL}/api/v1/jobs/${jobId}/download`,
      method: 'GET',
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
  },
  downloadPrismaDiagram: (jobId: number | string) => {
    return axios({
      url: `${API_URL}/api/v1/jobs/${jobId}/prisma-diagram`,
      method: 'GET',
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
  },
  downloadLatex: (jobId: number | string) => {
    return axios({
      url: `${API_URL}/api/v1/jobs/${jobId}/latex`,
      method: 'GET',
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
  },
  downloadBibtex: (jobId: number | string) => {
    return axios({
      url: `${API_URL}/api/v1/jobs/${jobId}/bibtex`,
      method: 'GET',
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
  },
  getScreenshot: (jobId: number | string) => {
    return `${API_URL}/api/v1/jobs/${jobId}/screenshot?t=${Date.now()}`;
  },
};

export default api;
