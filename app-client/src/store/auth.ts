import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

import type { User } from '../utils/types'

interface AuthState {
	user: User | null
	accessToken: string | null

	setAuth: (user: User | null, accessToken: string | null) => void
	clearAuth: () => void

	setUser: (user: User | null) => void

	logout: () => Promise<void>

	isInitialized: boolean
}

export const useAuth = create<AuthState>()(
	persist(
		(set: (partial: Partial<AuthState>) => void) => ({
			user: null,
			accessToken: null,
			isInitialized: false,

			setAuth: (user: User | null, accessToken: string | null) => set({ user, accessToken, isInitialized: true }),
			clearAuth: () => set({ user: null, accessToken: null, isInitialized: true }),

			setUser: (user: User | null) => set({ user, isInitialized: true }),

			logout: async () => {
				set({ user: null, accessToken: null, isInitialized: true })
				window.location.href = '/login'

				await axios.post('/api/auth/logout')
			}
		}),
		{
			name: 'homeschool-auth',
			partialize: (state: AuthState) => ({
				user: state.user,
				accessToken: state.accessToken
			})
		}
	)
)
