export interface Family {
	id: string
	name: string
}

export interface User {
	id: string
	username: string
	firstName: string
	lastName: string
	fullName: string
	preferredName: string | null
	displayName: string
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

export interface Subject {
	id: string
	name: string
	icon: string | null
	description: string | null
	color: string | null
}
