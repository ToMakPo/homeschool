import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

import type { User } from '../utils/types'

interface AuthState {
	user: User | null
	accessToken: string | null
	setAuth: (user: User | null, accessToken: string | null) => void
	setUser: (user: User | null) => void
	logout: (soft?: boolean) => Promise<void>
}

export const useAuth = create<AuthState>()(
	persist(
		(set: (partial: Partial<AuthState>) => void) => ({
			user: null,
			accessToken: null,
			setAuth: (user: User | null, accessToken: string | null) => set({ user, accessToken }),
			setUser: (user: User | null) => set({ user }),
			logout: async (soft = false) => {
				set({ user: null, accessToken: null })
				window.location.href = '/login'
				if (soft) return

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
