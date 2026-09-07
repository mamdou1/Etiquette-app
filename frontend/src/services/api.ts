import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Intercepteur pour ajouter le token
api.interceptors.request.use(
  (config) => {
    const authData = localStorage.getItem('etiquettes_auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        const token = parsed.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (e) {
        console.error('❌ Erreur parsing token:', e);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export { api };

// ─── ✅ MODIFIER : uploadExcel accepte FormData ──────────────
export const uploadExcel = async (formData: FormData) => {
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};