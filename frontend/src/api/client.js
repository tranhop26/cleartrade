import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

export const getPrices     = () => api.get('/prices').then(r => r.data.data)
export const getPortfolio  = () => api.get('/portfolio').then(r => r.data.data)
export const getDecisions  = () => api.get('/decisions').then(r => r.data.data)
export const runAgent      = () => api.post('/run-agent').then(r => r.data.data)
export const verifyHash    = (hash) => api.get(`/verify/${hash}`).then(r => r.data.data)
export const getHealth     = () => api.get('/health').then(r => r.data)

export default api
