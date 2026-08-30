import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../utils/types'

interface AuthState {
	user: User | null
	accessToken: string | null
	mustChangePassword: boolean
	setAuth: (user: User | null, accessToken: string | null, mustChangePassword: boolean) => void
	setToken: (accessToken: string | null) => void
	updateUser: (user: User | null) => void
	setMustChangePassword: (mustChangePassword: boolean) => void
	logout: () => void
}

export const useAuth = create<AuthState>()(
	persist(
		(set: (partial: Partial<AuthState>) => void) => ({
			user: null,
			accessToken: null,
			mustChangePassword: false,
			setAuth: (user: User | null, accessToken: string | null, mustChangePassword: boolean) =>
				set({ user, accessToken, mustChangePassword }),
			setToken: (accessToken: string | null) => set({ accessToken }),
			updateUser: (user: User | null) => set({ user }),
			setMustChangePassword: (mustChangePassword: boolean) => set({ mustChangePassword }),
			logout: () => set({ user: null, accessToken: null, mustChangePassword: false })
		}),
		{
			name: 'homeschool-auth',
			partialize: (state: AuthState) => ({
				user: state.user,
				mustChangePassword: state.mustChangePassword,
				accessToken: state.accessToken
			})
		}
	)
)
