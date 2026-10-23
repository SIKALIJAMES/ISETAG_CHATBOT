import axios from 'axios';

export const TOKEN_KEY = 'token';
export const LEGACY_KEY = 'isetag_token';
export const LAST_ACTIVITY_KEY = 'isetag_last_activity';

// 15 minutes of inactivity triggers auto-logout
export const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
// Warning appears 60 seconds before lockout (at 14 minutes)
export const INACTIVITY_WARNING_MS = 14 * 60 * 1000;

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(LEGACY_KEY, token);
    recordActivity();
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}

export function recordActivity() {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function getLastActivity() {
  const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!stored) return Date.now();
  const parsed = parseInt(stored, 10);
  return isNaN(parsed) ? Date.now() : parsed;
}

export function isSessionExpired() {
  const token = getToken();
  if (!token) return true;

  const lastActive = getLastActivity();
  if (lastActive > Date.now()) {
    recordActivity();
    return false;
  }

  if (Date.now() - lastActive > INACTIVITY_TIMEOUT_MS) {
    return true;
  }

  // Safe JWT exp verification
  try {
    const base64Url = token.split('.')[1];
    if (base64Url) {
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const parsed = JSON.parse(jsonPayload);
      if (parsed.exp && parsed.exp * 1000 < Date.now()) {
        return true;
      }
    }
  } catch (e) {
    // If decoding fails, don't auto-expire; let the backend verify
    return false;
  }

  return false;
}

// ── Dedicated API client instance ──
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Configure interceptor function for any axios instance (both default axios and custom api)
const setupInterceptors = (instance) => {
  instance.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    recordActivity();
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      recordActivity();
      return response;
    },
    (error) => {
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/verify');

      if (
        error.response?.status === 401 &&
        !isAuthEndpoint &&
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/preinscription')
      ) {
        clearToken();
        window.location.href = '/login?reason=expired';
      }
      return Promise.reject(error);
    }
  );
};

// Apply to BOTH global axios AND the api instance
setupInterceptors(axios);
setupInterceptors(api);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  verify: () => api.get('/auth/verify'),
  logout: () => api.post('/auth/logout'),
};

export default api;
