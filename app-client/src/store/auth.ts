import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../utils/types'

interface AuthState {
	user: User | null
	accessToken: string | null
	setAuth: (user: User | null, accessToken: string | null) => void
}

export const useAuth = create<AuthState>()(
	persist(
		(set: (partial: Partial<AuthState>) => void) => ({
			user: null,
			accessToken: null,
			setAuth: (user: User | null, accessToken: string | null) => set({ user, accessToken })
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
