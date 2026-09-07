import type { User } from './types'

export function getRoleKey(role: string) {
	return `is${role.charAt(0).toUpperCase() + role.slice(1)}` as `is${Capitalize<User['role']>}`
}
