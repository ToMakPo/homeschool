import { create } from 'zustand'

import type { User, Family } from '../utils/types'
import apiClient from '../utils/api'

interface FamilyState {
	family: Family | null
	members: User[]

	setFamily: (family: Family) => void
	setMembers: (members: User[]) => void
	clearFamily: () => void

	fetchFamily: () => Promise<void>
}

export const useFamily = create<FamilyState>((set) => ({
	family: null,
	members: [],

	setFamily: (family) => set({ family }),
	setMembers: (members) => set({ members }),
	clearFamily: () => set({ family: null, members: [] }),

	fetchFamily: async () => {
		try {
			const response = await apiClient.get('/api/family')
			if (!response.passed) throw new Error('Failed to fetch family data')

			const { family, members } = response.data
			if (!family || !members) throw new Error('Incomplete family data')

			set({ family, members })
		} catch (error) {
			console.error('Error fetching family data:', error)
			set({ family: null, members: [] })
		}
	}
}))
