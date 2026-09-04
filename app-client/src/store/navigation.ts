import { create } from 'zustand'

export const SelectedLayout = ['dashboard', 'profile'] as const
export type SelectedLayout = (typeof SelectedLayout)[number]

interface NavigationState {
	selectedLayout: SelectedLayout
	setSelectedLayout: (layout: SelectedLayout) => void
}

export const useNavigation = create<NavigationState>((set) => ({
	selectedLayout: 'dashboard',
	setSelectedLayout: (layout) => set({ selectedLayout: layout })
}))
