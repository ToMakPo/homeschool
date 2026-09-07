import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

import type { User } from '../utils/types'

interface AuthState {
	user: User | null
	accessToken: string | null
	isInitialized: boolean

	setAuth: (user: User | null, accessToken: string | null) => void
	clearAuth: () => void

	setUser: (user: User | null) => void

	logout: () => Promise<void>
}

export const useAuth = create<AuthState>()(
	persist(
		(set) => ({
			user: null,
			accessToken: null,
			isInitialized: false,

			setAuth: (user, accessToken) => set({ user, accessToken, isInitialized: true }),
			clearAuth: () => set({ user: null, accessToken: null, isInitialized: true }),

			setUser: (user) => set({ user, isInitialized: true }),

			logout: async () => {
				set({ user: null, accessToken: null, isInitialized: true })

				window.location.href = '/login'

				await axios.post('/api/auth/logout')
			}
		}),
		{
			name: 'homeschool-auth',
			partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
			onRehydrateStorage: () => () => useAuth.setState({ isInitialized: true })
		}
	)
)
