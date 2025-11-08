const axios = require('axios');
const config = require('./utils/config');

class ApiClient {
  constructor() {
    this.baseURL = config.getApiUrl();
  }

  _getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    const token = config.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  _getClient() {
    return axios.create({
      baseURL: this.baseURL,
      headers: this._getHeaders(),
      timeout: 30000
    });
  }

  async request(method, endpoint, data = null, options = {}) {
    try {
      const client = this._getClient();
      const response = await client.request({
        method,
        url: endpoint,
        data,
        ...options
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        // Server responded with error status
        throw new Error(error.response.data.detail || error.response.data.message || error.message);
      } else if (error.request) {
        // No response received
        throw new Error(`Cannot connect to API at ${this.baseURL}. Is the server running?`);
      } else {
        throw error;
      }
    }
  }

  // Auth endpoints
  async login(email, password) {
    // For token-based auth (we'll need to implement this endpoint in backend)
    return this.request('POST', '/api/v1/auth/token', { email, password });
  }

  async getCurrentUser() {
    return this.request('GET', '/api/v1/auth/me');
  }

  // Search job endpoints
  async createSearchJob(jobData) {
    return this.request('POST', '/api/v1/jobs/', jobData);
  }

  async getSearchJobs(skip = 0, limit = 100) {
    const response = await this.request('GET', `/api/v1/jobs/?skip=${skip}&limit=${limit}`);
    // Backend returns { jobs: [], total: number }, normalize to array
    return response.jobs || response;
  }

  async getSearchJob(jobId) {
    return this.request('GET', `/api/v1/jobs/${jobId}`);
  }

  async deleteSearchJob(jobId) {
    return this.request('DELETE', `/api/v1/jobs/${jobId}`);
  }

  async resumeSearchJob(jobId) {
    return this.request('POST', `/api/v1/jobs/${jobId}/resume`);
  }

  async downloadCsv(jobId) {
    const client = this._getClient();
    const response = await client.get(`/api/v1/jobs/${jobId}/download`, {
      responseType: 'arraybuffer'
    });
    return response.data;
  }

  async downloadPrismaDiagram(jobId) {
    const client = this._getClient();
    const response = await client.get(`/api/v1/jobs/${jobId}/prisma-diagram`, {
      responseType: 'arraybuffer'
    });
    return response.data;
  }

  async downloadLatex(jobId) {
    const client = this._getClient();
    const response = await client.get(`/api/v1/jobs/${jobId}/latex`, {
      responseType: 'arraybuffer'
    });
    return response.data;
  }

  async downloadBibtex(jobId) {
    const client = this._getClient();
    const response = await client.get(`/api/v1/jobs/${jobId}/bibtex`, {
      responseType: 'arraybuffer'
    });
    return response.data;
  }

  // Health check
  async health() {
    return this.request('GET', '/health');
  }
}

module.exports = new ApiClient();
