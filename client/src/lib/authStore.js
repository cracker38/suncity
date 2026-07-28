import { create } from 'zustand';
import { api } from './api';
import { ROLE_DASHBOARDS } from './roleDashboards';

export const useAuth = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('sc_user') || 'null'),
  permissions: [],
  loading: false,

  dashboardPath: () => ROLE_DASHBOARDS[get().user?.role]?.path || '/dashboard',

  setSession: ({ user, accessToken, refreshToken }) => {
    localStorage.setItem('sc_access', accessToken);
    if (refreshToken) localStorage.setItem('sc_refresh', refreshToken);
    localStorage.setItem('sc_user', JSON.stringify(user));
    set({ user });
  },

  login: async (payload) => {
    const res = await api.post('/auth/login', payload);
    get().setSession(res.data);
    return res.data;
  },

  register: async (payload) => {
    const res = await api.post('/auth/register', payload);
    get().setSession(res.data);
    return res.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout', { refreshToken: localStorage.getItem('sc_refresh') });
    } catch {
      // ignore
    }
    localStorage.removeItem('sc_access');
    localStorage.removeItem('sc_refresh');
    localStorage.removeItem('sc_user');
    set({ user: null, permissions: [] });
  },

  refreshMe: async () => {
    if (!localStorage.getItem('sc_access')) return null;
    try {
      const res = await api.get('/auth/me');
      localStorage.setItem('sc_user', JSON.stringify(res.data.user));
      set({ user: res.data.user, permissions: res.data.permissions || [] });
      return res.data.user;
    } catch {
      get().logout();
      return null;
    }
  },
}));

export function formatMoney(n) {
  return `RWF ${Number(n || 0).toLocaleString()}`;
}
