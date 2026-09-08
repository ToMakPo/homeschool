import { AxiosRequestConfig } from 'axios'
import { ApiResponse } from './api-response'

declare module 'axios' {
	export interface AxiosInstance {
		request<T = any, R = ApiResponse<T>, D = any>(config: AxiosRequestConfig<D>): Promise<R>
		get<T = any, R = ApiResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>
		delete<T = any, R = ApiResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>
		head<T = any, R = ApiResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>
		options<T = any, R = ApiResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>
		post<T = any, R = ApiResponse<T>, D = any>(url: string, data?: any, config?: AxiosRequestConfig<D>): Promise<R>
		put<T = any, R = ApiResponse<T>, D = any>(url: string, data?: any, config?: AxiosRequestConfig<D>): Promise<R>
		patch<T = any, R = ApiResponse<T>, D = any>(url: string, data?: any, config?: AxiosRequestConfig<D>): Promise<R>
	}
}
