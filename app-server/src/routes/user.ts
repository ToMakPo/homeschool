import { Router, Request, Response } from 'express'

import pool from '../database/config'
import { authenticate } from '../middleware/auth'
import { upload } from '../middleware/storage'
import { validateBoolean, validateEnum, validateName, validateString, validateUsername, ValidationResult } from '../utils/validation'
import { apiResponse } from '../utils/api-response'
import { User } from '../utils/types'

const router = Router()
router.use(authenticate)

export function formatUser(user: User): User {
	user.isStudent = Boolean(user.isStudent)
	user.isParent = Boolean(user.isParent)
	user.isAdmin = Boolean(user.isAdmin)
	user.isOwner = Boolean(user.isOwner)
	user.passwordReset = Boolean(user.passwordReset)
	user.createdAt = new Date(user.createdAt)

	return user
}

export function cleanUserRecords(result: any[]) {
	return (result[0] as User[]).map((u) => formatUser(u))
}

//////////////////////////////////////////
/// GET THE CURRENT USER'S INFORMATION ///
//////////////////////////////////////////
// #region GET /
/**
 * Gets the current authenticated user's information.
 *
 * @route GET /api/user
 * @middleware authenticate
 * @returns {User} The current authenticated user's information.
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
	const sender = 'GET_USER_SELF'

	const user = req.user
	if (!user) return res.json(apiResponse(sender, 400, false, 'You are not authenticated.'))

	try {
		const foundUser = (await pool.query('SELECT * FROM view_user WHERE id = ?', [user.id]).then(cleanUserRecords))[0]
		if (!foundUser) return res.json(apiResponse(sender, 401, false, 'User not found.'))

		return res.json(apiResponse(sender, 200, true, 'User fetched successfully.', foundUser))
	} catch (err) {
		console.error(err)
		return res.json(apiResponse(sender, 500, false, 'Internal server error.'))
	}
})

///////////////////////////////
/// UPDATE USER INFORMATION ///
///////////////////////////////
// #region PATCH /
/**
 * Updates the current authenticated user's information.
 *
 * @route PATCH /api/user/
 * @middleware authenticate
 * @param {string} [targetId] - The ID of the target user to update. Defaults to the current user.
 * @param {Object} updates - The fields to update.
 * @returns {User} The updated user's information.
 */
router.patch('/', authenticate, async (req: Request, res: Response) => {
	const sender = 'PATCH_USER_SELF'

	try {
		const user = req.user
		if (!user) return res.json(apiResponse(sender, 400, false, 'You are not authenticated.'))

		const targetId = req.body.targetId ?? user.id
		const target =
			targetId === user.id ? user : (await pool.query('SELECT * FROM view_user WHERE id = ?', [targetId]).then(cleanUserRecords))[0]
		if (!target) return res.json(apiResponse(sender, 401, false, 'Target user not found.'))

		if (targetId !== user.id) {
			if (!user.isOwner && target.isParent) return res.json(apiResponse(sender, 402, false, 'Only owners can update parents.'))
			if (!user.isParent && target.isStudent) return res.json(apiResponse(sender, 403, false, 'Only parents can update students.'))
		}

		const validations: ValidationResult<any>[] = []
		const updates: Partial<User> = req.body.updates

		const newValues: Partial<Omit<User, 'id' | 'avatarUrl'>> = {}

		if (updates.username !== undefined) {
			const usernameValidation = await validateUsername(updates.username, target.id)
			newValues.username = usernameValidation.value!
			validations.push(usernameValidation)
		}

		if (updates.firstName !== undefined) {
			const firstNameValidation = await validateName(updates.firstName, 'First name', false)
			newValues.firstName = firstNameValidation.value!
			validations.push(firstNameValidation)
		}

		if (updates.lastName !== undefined) {
			const lastNameValidation = await validateName(updates.lastName, 'Last name', false)
			newValues.lastName = lastNameValidation.value!
			validations.push(lastNameValidation)
		}

		if (updates.preferredName !== undefined) {
			const preferredNameValidation = await validateName(updates.preferredName, 'Preferred name', true)
			newValues.preferredName = preferredNameValidation.value!
			validations.push(preferredNameValidation)
		}

		if (updates.role !== undefined) {
			const roleValidation = await validateEnum<User['role']>(updates.role, ['admin', 'parent', 'student'], 'Role')
			newValues.role = roleValidation.value!
			validations.push(roleValidation)
		}

		if (updates.isAdmin !== undefined) {
			const isAdminValidation = await validateBoolean(updates.isAdmin, 'Is Admin')
			newValues.isAdmin = isAdminValidation.value!
			validations.push(isAdminValidation)
		}

		if (updates.passwordReset !== undefined) {
			const passwordResetValidation = await validateBoolean(updates.passwordReset, 'Password Reset')
			newValues.passwordReset = passwordResetValidation.value!
			validations.push(passwordResetValidation)
		}

		if (validations.some((v) => !v.passed)) return res.json(apiResponse(sender, 404, false, 'Validation failed', { validations }))

		if (Object.keys(newValues).length === 0) return res.json(apiResponse(sender, 405, false, 'No valid fields to update'))

		const setClause = Object.keys(newValues)
			.map((key) => `${key} = ?`)
			.join(', ')
		const values = Object.values(newValues)

		await pool.execute(`UPDATE user SET ${setClause} WHERE id = ?`, [...values, target.id])
		const updatedUser = (await pool.query('SELECT * FROM view_user WHERE id = ?', [target.id]).then(cleanUserRecords))[0]

		// TODO: Broadcast to all family members that the target has updated their information.

		return res.json(apiResponse(sender, 200, true, 'User updated successfully.', updatedUser))
	} catch (err) {
		console.error(err)
		return res.json(apiResponse(sender, 500, false, 'Internal server error'))
	}
})

//////////////////////////
/// UPDATE USER AVATAR ///
//////////////////////////
// #region PATCH /avatar
/**
 * Updates the current authenticated user's avatar.
 *
 * @route PATCH /api/user/avatar
 * @middleware authenticate
 * @middleware upload.single('avatar')
 * @param {File} avatar - The new avatar image file.
 * @returns {Object} The URL of the updated avatar.
 */
router.patch('/avatar', authenticate, upload.single('avatar'), async (req: Request, res: Response) => {
	const sender = 'PATCH_USER_AVATAR'

	const user = req.user
	if (!user) return res.json(apiResponse(sender, 1400, false, 'You are not authenticated.'))

	const file = req.file
	if (!file) {
		return res.json(apiResponse(sender, 1401, false, 'No file uploaded'))
	}

	try {
		const avatarUrl = `/uploads/${file.filename}`
		await pool.execute('UPDATE user SET avatarUrl = ? WHERE id = ?', [avatarUrl, user.id])

		//TODO: brodcast to all family members that the user has updated their avatar.

		return res.json(apiResponse(sender, 200, true, 'Avatar updated successfully', { avatarUrl }))
	} catch (err) {
		console.error(err)
		return res.json(apiResponse(sender, 500, false, 'Internal server error'))
	}
})

///////////////////////////
/// DELETE USER ACCOUNT ///
///////////////////////////
// #region DELETE /
/**
 * Deletes the current authenticated user's account or another user's account if the authenticated user is a parent.
 *
 * @route DELETE /api/user/
 * @middleware authenticate
 * @param {string} [userId] - The ID of the user to delete (optional, only for parents).
 * @returns {Object} A message indicating the result of the operation.
 */
router.delete('/', authenticate, async (req: Request, res: Response) => {
	const sender = 'DELETE_USER_SELF'

	const user = req.user
	if (!user) return res.json(apiResponse(sender, 400, false, 'You are not authenticated.'))

	const force = (await validateBoolean(req.body.force, 'Force', true)).value ?? false
	const promoteId = (await validateString(req.body.promoteId, 'Promote ID', true)).value || null

	try {
		// If the user is a student, then do not allow deletion unless forced.
		if (user.isStudent) {
			if (force) {
				await pool.execute('DELETE FROM user WHERE id = ?', [user.id])

				// TODO: Broadcast to all other family members that the user has left the family.
				// TODO: Broadcast to all other user sessions that the user has been deleted and logged out.

				return res.json(apiResponse(sender, 250, true, 'User account deleted successfully.'))
			} else {
				return res.json(
					apiResponse(sender, 401, false, 'You are not authorized to delete your account. Please contact a parent to delete your account.')
				)
			}
		}

		// Get all of the other family members other than the current user.
		const otherMembers = await pool
			.query('SELECT * FROM view_user WHERE familyId = ? AND id != ?', [user.familyId, user.id])
			.then(cleanUserRecords)

		// If the user is the only member of the family, then delete the user and the family.
		if (otherMembers.length === 0) {
			await pool.execute('DELETE FROM family WHERE id = ?', [user.familyId])
			await pool.execute('DELETE FROM user WHERE id = ?', [user.id])

			// TODO: Broadcast to all other user sessions that the user has been deleted and logged out.

			return res.json(apiResponse(sender, 200, true, 'User account and family deleted successfully.'))
		}

		// Get all other parents.
		const otherParents = otherMembers.filter((m) => m.isParent)

		// If you are the only parent, then that means there are only students, so do not allow deletion unlessed force.
		if (otherParents.length === 0) {
			if (force) {
				// If being forced, delete the family, the students, and the user.
				await pool.execute('DELETE FROM family WHERE id = ?', [user.familyId])
				await pool.execute('DELETE FROM user WHERE familyId = ?', [user.familyId])

				// TODO: Brodcast to all family member user sessions that the user had been deleted and to log out.

				return res.json(apiResponse(sender, 251, true, 'The user has been deleted along with the family and other members.'))
			} else {
				return res.json(
					apiResponse(sender, 402, false, 'The user was not able to be deleted due to being the only parent while students exist.')
				)
			}
		}

		// If here, then there are other parents and user is the owner, then someone else needs to be made the owener.
		if (user.isOwner) {
			if (promoteId) {
				const promoteUser = otherMembers.find((m) => m.id === promoteId)

				if (!promoteUser) return res.json(apiResponse(sender, 403, false, 'The promote user is not within the family.'))

				if (!promoteUser.isParent) return res.json(apiResponse(sender, 404, false, 'The promote user is not a parent.'))

				await pool.execute('UPDATE user SET role = ? WHERE id = ?', ['owner', promoteId])

				// TODO: Brodcast to family that there is a new owner.

				await pool.execute('DELETE FROM user WHERE id = ?', [user.id])

				// TODO: Brodcast to family that user has left.
				// TODO: Brodcast to user sessions that user is deleted and to logout.

				return res.json(apiResponse(sender, 201, true, 'Selected parent was promoted and the user has been delted.'))
			} else if (force) {
				const promoteUser = (() => {
					const admin = otherParents
						.filter((m) => m.isAdmin)
						.reduce((oldest, current) => (current.createdAt < oldest.createdAt ? current : oldest), null as unknown as User)
					if (admin) return admin

					return otherParents.reduce((oldest, current) => (current.createdAt < oldest.createdAt ? current : oldest))
				})()

				await pool.execute('UPDATE user SET role = ? WHERE id = ?', ['owner', promoteUser.id])

				// TODO: Brodcast to family that there is a new owner.

				await pool.execute('DELETE FROM user WHERE id = ?', [user.id])

				// TODO: Brodcast to family that user has left.
				// TODO: Brodcast to user sessions that user is deleted and to logout.

				return res.json(apiResponse(sender, 252, true, 'Other parent was promoted and the user has been delted.'))
			} else {
				return res.json(
					apiResponse(sender, 405, false, 'The user was not able to be deleted due to being the only admin while other members exist.')
				)
			}
		}

		await pool.execute('DELETE FROM user WHERE id = ?', [user.id])

		// TODO: Brodcast to family that user has left.
		// TODO: Brodcast to user sessions that user is deleted and to logout.

		return res.json(apiResponse(sender, 202, true, 'Selected parent was promoted and the user has been delted.'))
	} catch (err) {
		console.error(err)
		return res.json(apiResponse(sender, 500, false, 'Internal server error'))
	}
})

export default router
