import axios from 'axios';

// Get API URL - supports both web and Electron modes
let cachedApiUrl = null;

async function getApiUrl() {
  // If already cached, return it
  if (cachedApiUrl) {
    return cachedApiUrl;
  }

  // Check if running in Electron
  if (window.electron && window.electron.getApiUrl) {
    try {
      cachedApiUrl = await window.electron.getApiUrl();
      console.log('Electron API URL:', cachedApiUrl);
      return cachedApiUrl;
    } catch (error) {
      console.error('Failed to get Electron API URL:', error);
    }
  }

  // Fallback to environment variable or default
  cachedApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  return cachedApiUrl;
}

// Initialize with default, will be updated by interceptor
const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to set baseURL dynamically
api.interceptors.request.use(async (config) => {
  // Get the API URL (from Electron or environment)
  const apiUrl = await getApiUrl();

  // Update baseURL if not already set or if it's relative
  if (!config.baseURL || config.baseURL.startsWith('/')) {
    config.baseURL = `${apiUrl}/api/v1`;
  }

  // Add auth token
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
  downloadResults: async (jobId) => {
    const apiUrl = await getApiUrl();
    return axios({
      url: `${apiUrl}/api/v1/jobs/${jobId}/download`,
      method: 'GET',
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
  },
  downloadPrismaDiagram: async (jobId) => {
    const apiUrl = await getApiUrl();
    return axios({
      url: `${apiUrl}/api/v1/jobs/${jobId}/prisma-diagram`,
      method: 'GET',
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
  },
  downloadLatex: async (jobId) => {
    const apiUrl = await getApiUrl();
    return axios({
      url: `${apiUrl}/api/v1/jobs/${jobId}/latex`,
      method: 'GET',
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
  },
  downloadBibtex: async (jobId) => {
    const apiUrl = await getApiUrl();
    return axios({
      url: `${apiUrl}/api/v1/jobs/${jobId}/bibtex`,
      method: 'GET',
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
  },
  getScreenshot: async (jobId) => {
    const apiUrl = await getApiUrl();
    return `${apiUrl}/api/v1/jobs/${jobId}/screenshot?t=${Date.now()}`;
  },
};

// Export getApiUrl for components that need it
export { getApiUrl };

export default api;
