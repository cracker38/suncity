const API_BASE = import.meta.env.VITE_API_URL || '/api';

let _refreshing = null;

async function request(path, options = {}) {
  const token = localStorage.getItem('sc_access');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Silent token refresh on 401
  if (res.status === 401 && !path.includes('/auth/') && localStorage.getItem('sc_refresh')) {
    if (!_refreshing) {
      _refreshing = fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: localStorage.getItem('sc_refresh') }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d?.data?.accessToken) {
            localStorage.setItem('sc_access', d.data.accessToken);
          } else {
            localStorage.removeItem('sc_access');
            localStorage.removeItem('sc_refresh');
            localStorage.removeItem('sc_user');
          }
        })
        .catch(() => {
          localStorage.removeItem('sc_access');
          localStorage.removeItem('sc_refresh');
          localStorage.removeItem('sc_user');
        })
        .finally(() => { _refreshing = null; });
    }
    await _refreshing;
    const newToken = localStorage.getItem('sc_access');
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      const retry = await fetch(`${API_BASE}${path}`, { ...options, headers });
      const isJson2 = retry.headers.get('content-type')?.includes('application/json');
      const data2 = isJson2 ? await retry.json() : await retry.blob();
      if (!retry.ok) {
        const err = new Error(data2?.message || 'Request failed');
        err.status = retry.status;
        err.payload = data2;
        throw err;
      }
      return data2;
    }
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.blob();

  if (!res.ok) {
    const message = data?.message || 'Request failed';
    const error = new Error(message);
    error.status = res.status;
    error.payload = data;
    throw error;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  download: async (path, filename) => {
    const token = localStorage.getItem('sc_access');
    const res = await fetch(`${API_BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export default api;
