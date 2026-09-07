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
}

export const useAuth = create<AuthState>()(
	persist(
		(set) => ({
			user: null,
			accessToken: null,

			setAuth: (user, accessToken) => set({ user, accessToken }),

			clearAuth: () => set({ user: null, accessToken: null }),

			setUser: (user) => set({ user }),

			logout: async () => {
				set({ user: null, accessToken: null })

				window.location.href = '/login'

				await axios.post('/api/auth/logout').catch((e) => console.error('Logout request failed:', e))
			}
		}),
		{
			name: 'homeschool-auth',
			partialize: (state) => ({ user: state.user, accessToken: state.accessToken })
		}
	)
)
