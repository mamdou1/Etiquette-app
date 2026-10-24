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
export const uploadExcel = async (formData: FormData, perfId?: string) => {
  const startedAt = performance.now();
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(perfId ? { 'X-Perf-Id': perfId } : {}),
    },
  });
  if (process.env.NODE_ENV === 'development' || process.env.REACT_APP_PERF_LOGS === '1') {
    console.info('[PERF][FRONTEND]', {
      operation: 'upload-http-roundtrip',
      durationMs: Number((performance.now() - startedAt).toFixed(2)),
      perfId,
      statusCode: response.status,
      enrichedBoxes: Array.isArray(response.data?.enriched) ? response.data.enriched.length : 0,
      sheets: Array.isArray(response.data?.sheets) ? response.data.sheets.length : 0,
    });
  }
  return response.data;
};
