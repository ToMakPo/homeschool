import { create } from 'zustand'
import type { User } from '../utils/types'

type NavigationItem = {
	label: string
	icon: string
	page: string
	roles: User['role'][]
}

export const navigationItems: Record<string, NavigationItem> = {
	dashboard: { label: 'Dashboard', icon: 'dashboard_2', page: 'dashboard', roles: ['parent', 'student'] },
	subjects: { label: 'Subjects', icon: 'square_foot', page: 'subjects', roles: ['admin'] },
	family: { label: 'Family', icon: 'family_restroom', page: 'family', roles: ['parent', 'student'] },
	profile: { label: 'Settings', icon: 'settings', page: 'profile', roles: ['parent', 'student'] }
} as const
export type NavigationPage = (typeof navigationItems)[keyof typeof navigationItems]['page']

interface NavigationState {
	selectedPage: NavigationPage
	setSelectedPage: (page: NavigationPage) => void
	getPageTitle: () => string | undefined
}

export const useNavigation = create<NavigationState>((set, get) => ({
	selectedPage: 'dashboard',
	setSelectedPage: (page) => set({ selectedPage: page }),
	getPageTitle: () => {
		const item = navigationItems[get().selectedPage]
		return item?.label
	}
}))
