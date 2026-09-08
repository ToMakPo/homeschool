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
			const response = await apiClient.get<{ family: Family; members: User[] }>('/api/family')
			if (!response.passed) throw new Error('Failed to fetch family data')

			// const authToken = useAuth.getState().authToken

			// if (!authToken) throw new Error('No authentication token available')

			// const familyResponse = await axios
			// 	.get('/api/family', { headers: { Authorization: `Bearer ${authToken}` } })
			// 	.then((response) => response.data as ApiResponse)

			// if (!familyResponse.passed) throw new Error('Failed to fetch family data')

			// const fetchedFamily: Family = familyResponse.data.family
			// const fetchedMembers: User[] = familyResponse.data.members

			// if (!fetchedFamily || !fetchedMembers) throw new Error('Incomplete family data')

			// set({ family: fetchedFamily, members: fetchedMembers })
		} catch (error) {
			console.error('Error fetching family data:', error)
			set({ family: null, members: [] })
		}
	}
}))
