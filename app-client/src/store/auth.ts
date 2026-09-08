import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'

import type { User } from '../utils/types'
import apiClient from '../utils/api'

import { useFamily } from './family'

interface AuthState {
	user: User | null
	authToken: string | null

	setAuth: (user: User | null, authToken: string | null) => void
	clearAuth: () => void
	setUser: (user: User | null) => void
	logout: () => Promise<void>
}

export const useAuth = create<AuthState>()(
	subscribeWithSelector(
		persist(
			(set) => ({
				user: null,
				authToken: null,

				setAuth: (user, authToken) => set({ user, authToken }),

				clearAuth: () => set({ user: null, authToken: null }),

				setUser: (user) => set({ user }),

				logout: async () => {
					set({ user: null, authToken: null })

					window.location.href = '/login'

					await apiClient.post('/api/auth/logout')
				}
			}),
			{
				name: 'homeschool-auth',
				partialize: (state) => ({ user: state.user, authToken: state.authToken })
			}
		)
	)
)

useAuth.subscribe(
	(state) => state.user,
	(user) => useFamily.getState()[user ? 'fetchFamily' : 'clearFamily'](),
	{ fireImmediately: true }
)
