import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Auto-redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem('isetag_token')
      if (token) {
        localStorage.removeItem('isetag_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Attach token from localStorage if present (for Vercel deployments)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('isetag_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
}

export const faqsAPI = {
  list: (params) => api.get('/faqs', { params }),
  get: (id) => api.get(`/faqs/${id}`),
  create: (data) => api.post('/faqs', data),
  update: (id, data) => api.put(`/faqs/${id}`, data),
  toggle: (id) => api.patch(`/faqs/${id}/toggle`),
  delete: (id) => api.delete(`/faqs/${id}`),
}

export const conversationsAPI = {
  list: (params) => api.get('/conversations', { params }),
  get: (id) => api.get(`/conversations/${id}`),
  close: (id) => api.patch(`/conversations/${id}/close`),
}

export const statsAPI = {
  overview: () => api.get('/stats/overview'),
  messagesPerDay: () => api.get('/stats/messages-per-day'),
  topFaqs: () => api.get('/stats/top-faqs'),
  escalationRate: () => api.get('/stats/escalation-rate'),
  languages: () => api.get('/stats/languages'),
}

export default api
