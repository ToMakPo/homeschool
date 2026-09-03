export interface Family {
	id: string
	name: string
}

export interface User {
	id: string
	username: string
	firstName: string
	lastName: string
	displayName: string | null
	familyId: string | null
	role: 'owner' | 'admin' | 'parent' | 'student'
	isStudent: boolean
	isParent: boolean
	isAdmin: boolean
	isOwner: boolean
	avatarUrl: string | null
	passwordReset: boolean
	createdAt: Date
}
