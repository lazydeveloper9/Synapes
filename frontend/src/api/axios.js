import axios from 'axios';

const api = axios.create({
  baseURL: `http://${window.location.hostname}:5000/api`,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('df_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      const onAuthPage = ['/login', '/register', '/'].some(p => window.location.pathname === p);
      // Only clear session and redirect when NOT already on an auth page
      // This prevents an infinite redirect loop when token is missing
      if (!onAuthPage) {
        localStorage.removeItem('df_token');
        localStorage.removeItem('df_user');
        // Preserve current location so user can return after login
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?redirect=${redirect}`;
      }
    }
    return Promise.reject(err);
  }
);

export default api;