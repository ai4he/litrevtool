import axios, { AxiosInstance } from 'axios';
import { getToken } from './auth';
import { getApiUrl } from './electron';

/**
 * Create axios instance with proper configuration for Next.js, Electron, and mobile
 */
const createAPIClient = async (): Promise<AxiosInstance> => {
  // Get API URL (from Electron if available, otherwise from env)
  const baseURL = await getApiUrl();

  const instance = axios.create({
    baseURL: `${baseURL}/api/v1`,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add auth token
  instance.interceptors.request.use(
    (config) => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Unauthorized - redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

/**
 * API client instance (lazy-loaded)
 */
let apiClientInstance: AxiosInstance | null = null;

export const getAPIClient = async (): Promise<AxiosInstance> => {
  if (!apiClientInstance) {
    apiClientInstance = await createAPIClient();
  }
  return apiClientInstance;
};

/**
 * Auth API
 */
export const authAPI = {
  googleLogin: async (credential: string) => {
    const api = await getAPIClient();
    return api.post('/auth/google', { credential });
  },
};

/**
 * Jobs API
 */
export const jobsAPI = {
  listJobs: async () => {
    const api = await getAPIClient();
    return api.get('/jobs');
  },

  getJob: async (jobId: number) => {
    const api = await getAPIClient();
    return api.get(`/jobs/${jobId}`);
  },

  createJob: async (jobData: any) => {
    const api = await getAPIClient();
    return api.post('/jobs', jobData);
  },

  deleteJob: async (jobId: number) => {
    const api = await getAPIClient();
    return api.delete(`/jobs/${jobId}`);
  },

  pauseJob: async (jobId: number) => {
    const api = await getAPIClient();
    return api.post(`/jobs/${jobId}/pause`);
  },

  resumeJob: async (jobId: number) => {
    const api = await getAPIClient();
    return api.post(`/jobs/${jobId}/resume`);
  },

  downloadResults: async (jobId: number) => {
    const api = await getAPIClient();
    return api.get(`/jobs/${jobId}/download`, {
      responseType: 'blob',
    });
  },

  downloadPrismaDiagram: async (jobId: number) => {
    const api = await getAPIClient();
    return api.get(`/jobs/${jobId}/prisma-diagram`, {
      responseType: 'blob',
    });
  },

  downloadLatex: async (jobId: number) => {
    const api = await getAPIClient();
    return api.get(`/jobs/${jobId}/latex`, {
      responseType: 'blob',
    });
  },

  downloadBibtex: async (jobId: number) => {
    const api = await getAPIClient();
    return api.get(`/jobs/${jobId}/bibtex`, {
      responseType: 'blob',
    });
  },

  getPapers: async (jobId: number) => {
    const api = await getAPIClient();
    return api.get(`/jobs/${jobId}/papers`);
  },

  getScreenshot: (jobId: number) => {
    // Return URL for screenshot (used in img src)
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return `${baseURL}/api/v1/jobs/${jobId}/screenshot`;
  },
};

export default {
  auth: authAPI,
  jobs: jobsAPI,
};
