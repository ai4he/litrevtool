const Conf = require('conf');
const path = require('path');

class Config {
  constructor() {
    this.store = new Conf({
      projectName: 'litrevtool',
      configName: 'config',
      defaults: {
        apiUrl: 'http://localhost:8000',
        token: null,
        user: null
      }
    });
  }

  get(key) {
    return this.store.get(key);
  }

  set(key, value) {
    this.store.set(key, value);
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  getApiUrl() {
    return this.get('apiUrl');
  }

  setApiUrl(url) {
    // Remove trailing slash
    const cleanUrl = url.replace(/\/$/, '');
    this.set('apiUrl', cleanUrl);
  }

  getToken() {
    return this.get('token');
  }

  setToken(token) {
    this.set('token', token);
  }

  getUser() {
    return this.get('user');
  }

  setUser(user) {
    this.set('user', user);
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  logout() {
    this.delete('token');
    this.delete('user');
  }

  getConfigPath() {
    return this.store.path;
  }
}

module.exports = new Config();
