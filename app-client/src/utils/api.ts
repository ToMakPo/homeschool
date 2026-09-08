import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import type { ApiResponse } from './api-response'
import { useAuth } from '../store/auth'

// Create the base Axios instance
const axiosInstance: AxiosInstance = axios.create({
	baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
	timeout: 10000,
	headers: {
		'Content-Type': 'application/json'
	}
})

// Attach Request Interceptor (Inject Auth Token)
axiosInstance.interceptors.request.use(
	(config) => {
		const authToken = useAuth.getState().authToken
		if (authToken && config.headers) {
			config.headers.Authorization = `Bearer ${authToken}`
		}
		return config
	},
	(error) => Promise.reject(error)
)

// The Wrapper Client that unwraps and returns ApiResponse
export const apiClient = {
	async get(url: string, config?: AxiosRequestConfig): Promise<ApiResponse> {
		const response = await axiosInstance.get(url, config)
		return response.data as ApiResponse
	},

	async patch(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse> {
		const response = await axiosInstance.patch(url, data, config)
		return response.data as ApiResponse
	},

	async post(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse> {
		const response = await axiosInstance.post(url, data, config)
		return response.data as ApiResponse
	},

	async put(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse> {
		const response = await axiosInstance.put(url, data, config)
		return response.data as ApiResponse
	},

	async delete(url: string, config?: AxiosRequestConfig): Promise<ApiResponse> {
		const response = await axiosInstance.delete(url, config)
		return response.data as ApiResponse
	},

	// Expose the raw instance if you ever need access to headers or status codes directly
	raw: axiosInstance
}

export default apiClient
