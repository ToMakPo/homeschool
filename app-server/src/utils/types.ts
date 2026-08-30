export interface User {
	id: string
	username: string
	firstName: string
	lastName: string
	displayName: string | null
	role: 'parent' | 'student'
	avatarUrl: string | null
}

export interface Family {
	id: string
	name: string
	ownerId: string
	joinCode: string
}

export interface FamilyMember extends Omit<User, 'id'> {
	id: string
	familyId: string
	userId: string
}
