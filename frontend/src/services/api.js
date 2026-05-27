import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => Promise.reject(err)
)

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
}

export const uploadAPI = {
  uploadCSV: (formData) => api.post('/upload/csv', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  listDatasets: () => api.get('/upload/datasets'),
  getDataset: (id) => api.get(`/upload/datasets/${id}`),
  getDatasetSummary: (id) => api.get(`/upload/datasets/${id}/summary`),
  deleteDataset: (id) => api.delete(`/upload/datasets/${id}`),
}

export const analyticsAPI = {
  getDashboard: (id) => api.get(`/analytics/dashboard/${id}`),
  getInventory: (id) => api.get(`/analytics/inventory/${id}`),
  getCustomers: (id) => api.get(`/analytics/customers/${id}`),
  getSeasonal: (id, targetCol) => api.get(`/analytics/seasonal/${id}?target_column=${targetCol}`),
  getAnomalies: (id, targetCol) => api.get(`/analytics/anomalies/${id}?target_column=${targetCol}`),
  getColumns: (id) => api.get(`/analytics/columns/${id}`),
}

export const forecastAPI = {
  createForecast: (data) => api.post('/forecast/train', data),
  listJobs: () => api.get('/forecast/jobs'),
  getResult: (id) => api.get(`/forecast/jobs/${id}`),
  compareModels: (data) => api.post('/forecast/compare', data),
}

export default api
