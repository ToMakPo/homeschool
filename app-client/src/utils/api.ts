import axios, { type AxiosInstance } from 'axios'

import { useAuth } from '../store/auth'

const apiClient: AxiosInstance = axios.create({
	baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
	timeout: 10000,
	headers: { 'Content-Type': 'application/json' }
})

apiClient.interceptors.request.use(
	(config) => {
		const authToken = useAuth.getState().authToken
		if (authToken && config.headers) {
			config.headers.Authorization = `Bearer ${authToken}`
		}
		return config
	},
	(error) => {
		return Promise.reject(error)
	}
)

apiClient.interceptors.response.use(
	(response) => {
		const data = response.data
		if (data && data.passed !== undefined && data.code !== undefined && data.sender !== undefined) {
			return data as any
		}
		return response
	},
	(error) => Promise.reject(error)
)

export default apiClient
