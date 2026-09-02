export interface Family {
	id: string
	name: string
	ownerId: string
	joinCode: string
}

export interface User {
	id: string
	username: string
	firstName: string
	lastName: string
	displayName: string | null
	familyId: string | null
	role: 'parent' | 'student'
	isAdmin: boolean
	avatarUrl: string | null
	passwordReset: boolean
}
