// Centralized fetch wrapper for ThaiTrail API
// All requests go to /api (proxied by Vite to localhost:8000)
// Sessions are managed via cookies — credentials: 'include' is required.

const BASE = '/api';

async function request(method, path, data = null) {
  let url = `${BASE}${path}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // send/receive session cookie via Vite proxy
  };

  if (method === 'GET') {
    if (data && Object.keys(data).length > 0) {
      url += '?' + new URLSearchParams(data).toString();
    }
  } else if (data) {
    options.body = JSON.stringify(data);
  }

  const res = await fetch(url, options);
  const json = await res.json().catch(() => ({ success: false, message: 'Invalid JSON response' }));

  if (!res.ok) {
    const err = new Error(json.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return json;
}

export const api = {
  auth: {
    register:      (data)    => request('POST', '/auth/register', data),
    login:         (data)    => request('POST', '/auth/login',    data),
    logout:        ()        => request('POST', '/auth/logout'),
    me:            ()        => request('GET',  '/auth/me'),
    google:        (idToken) => request('POST', '/auth/google',   { id_token: idToken }),
  },
  user: {
    getInterests: ()     => request('GET',  '/user/interests'),
    setInterests: (data) => request('POST', '/user/interests', data),
  },
  recommendations: {
    get: (params = {}) => request('GET', '/recommendations', params),
  },
  places: {
    getAll: (params = {}) => request('GET', '/places', params),
  },
  signals: {
    log: (data) => request('POST', '/signals', data),
  },
};
