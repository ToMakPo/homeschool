import { create } from 'zustand'
import type { User } from '../utils/types'

export const NavigationPage = ['dashboard', 'profile'] as const
export type NavigationPage = (typeof NavigationPage)[number]

type NavigationItem = {
	label: string
	icon: string
	navPage: NavigationPage
	roles: User['role'][]
}

export const navigationItems: NavigationItem[] = [
	{ label: 'Dashboard', icon: 'dashboard_2', navPage: 'dashboard', roles: ['parent', 'student'] },
	{ label: 'Settings', icon: 'settings', navPage: 'profile', roles: ['parent', 'student'] }
] as const

interface NavigationState {
	selectedPage: NavigationPage
	setSelectedPage: (page: NavigationPage) => void
	getPageTitle: () => string | undefined
}

export const useNavigation = create<NavigationState>((set, get) => ({
	selectedPage: 'dashboard',
	setSelectedPage: (page) => set({ selectedPage: page }),
	getPageTitle: () => {
		const item = navigationItems.find(({ navPage }) => navPage === get().selectedPage)
		return item?.label
	}
}))
