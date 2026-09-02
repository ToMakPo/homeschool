import { Router, Request, Response } from 'express'
import pool from '../database/config'

import { authenticate } from '../middleware/auth'
import { upload } from '../middleware/storage'
import { validateBoolean, validateEnum, validateName, validateUsername, ValidationResult } from '../utils/validation'
import { apiResponce } from '../utils/api-responces'
import { User } from '../utils/types'

const router = Router()
router.use(authenticate)

//////////////////////////////////////////
/// GET THE CURRENT USER'S INFORMATION ///
//////////////////////////////////////////
// #region GET /self
/**
 * Gets the current authenticated user's information.
 *
 * @route GET /api/user/self
 * @middleware authenticate
 * @returns {User} The current authenticated user's information.
 * @throws {401} If the user is not authenticated.
 * @throws {404} If the user is not found in the database.
 * @throws {500} If there is an internal server error while fetching the user's information.
 */
router.get('/self', authenticate, async (req: Request, res: Response) => {
	const sender = 'GET_USER_SELF'

	const user = req.user
	if (!user) return res.json(apiResponce(sender, 400, false, 'You are not authenticated.'))

	try {
		const foundUser = (await pool.query('SELECT * FROM view_user WHERE id = ?', [user.id]).then(res => res[0] as User[]))[0]
		if (!foundUser) return res.json(apiResponce(sender, 401, false, 'User not found.'))

		return res.json(apiResponce(sender, 200, true, 'User fetched successfully.', foundUser))
	} catch (err) {
		console.error(err)
		return res.json(apiResponce(sender, 500, false, 'Internal server error.'))
	}
})

///////////////////////////////
/// UPDATE USER INFORMATION ///
///////////////////////////////
// #region PATCH /self
/**
 * Updates the current authenticated user's information.
 *
 * @route PATCH /api/user/self
 * @middleware authenticate
 * @param {Object} updates - The fields to update.
 * @returns {User} The updated user's information.
 * @throws {400} If any of the input fields are invalid.
 * @throws {401} If the user is not authenticated.
 * @throws {500} If there is an internal server error while updating the user's information.
 */
router.patch('/self', authenticate, async (req: Request, res: Response) => {
	const sender = 'PATCH_USER_SELF'

	const user = req.user
	if (!user) return res.json(apiResponce(sender, 400, false, 'You are not authenticated.'))

	const validationResults: ValidationResult<any>[] = []
	const errors: string[] = []
	const updates: Partial<User> = req.body.updates

	const newValues: Partial<Omit<User, 'id' | 'avatarUrl'>> = {}

	if (updates.username !== undefined) {
		const usernameValidation = await validateUsername(updates.username, user.id)
		const { passed, message, ...data } = usernameValidation
		if (passed) newValues.username = data.value!
		else errors.push('username')
		validationResults.push(usernameValidation)
	}

	if (updates.firstName !== undefined) {
		const firstNameValidation = await validateName(updates.firstName, 'First name', false)
		const { passed, message, ...data } = firstNameValidation
		if (passed) newValues.firstName = data.value!
		else errors.push('firstName')
		validationResults.push(firstNameValidation)
	}

	if (updates.lastName !== undefined) {
		const lastNameValidation = await validateName(updates.lastName, 'Last name', false)
		const { passed, message, ...data } = lastNameValidation
		if (passed) newValues.lastName = data.value!
		else errors.push('lastName')
		validationResults.push(lastNameValidation)
	}

	if (updates.displayName !== undefined) {
		const displayNameValidation = await validateName(updates.displayName, 'Display name', true)
		const { passed, message, ...data } = displayNameValidation
		if (passed) newValues.displayName = data.value!
		else errors.push('displayName')
		validationResults.push(displayNameValidation)
	}

	if (updates.role !== undefined) {
		const roleValidation = await validateEnum<User['role']>(updates.role, ['parent', 'student'], 'Role')
		const { passed, message, ...data } = roleValidation
		if (passed) newValues.role = data.value!
		else errors.push('role')
		validationResults.push(roleValidation)
	}

	if (updates.isAdmin !== undefined) {
		const isAdminValidation = await validateBoolean(updates.isAdmin, 'Is Admin')
		const { passed, message, ...data } = isAdminValidation
		if (passed) newValues.isAdmin = data.value!
		else errors.push('isAdmin')
		validationResults.push(isAdminValidation)
	}

	if (updates.passwordReset !== undefined) {
		const passwordResetValidation = await validateBoolean(updates.passwordReset, 'Password Reset')
		const { passed, message, ...data } = passwordResetValidation
		if (passed) newValues.passwordReset = data.value!
		else errors.push('passwordReset')
		validationResults.push(passwordResetValidation)
	}

	if (errors.length > 0) {
		return res.json(apiResponce(sender, 401, false, 'Validation errors occurred.', validationResults))
	}

	if (Object.keys(newValues).length === 0) {
		return res.json(apiResponce(sender, 402, false, 'No valid fields to update'))
	}

	const setClause = Object.keys(newValues)
		.map(key => `${key} = ?`)
		.join(', ')
	const values = Object.values(newValues)

	try {
		await pool.execute(`UPDATE user SET ${setClause} WHERE id = ?`, [...values, user.id])
		const updatedUser = (await pool.query('SELECT * FROM view_user WHERE id = ?', [user.id]).then(res => res[0] as User[]))[0]

		// TODO: Broadcast to all family members that the user has updated their information.

		return res.json(apiResponce(sender, 200, true, 'User updated successfully.', updatedUser))
	} catch (err) {
		console.error(err)
		return res.json(apiResponce(sender, 500, false, 'Internal server error'))
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
 * @throws {400} If no file is uploaded.
 * @throws {401} If the user is not authenticated.
 * @throws {500} If there is an internal server error while updating the avatar.
 */
router.patch('/avatar', authenticate, upload.single('avatar'), async (req: Request, res: Response) => {
	const sender = 'PATCH_USER_AVATAR'

	const user = req.user
	if (!user) return res.json(apiResponce(sender, 400, false, 'You are not authenticated.'))

	const file = req.file
	if (!file) {
		return res.json(apiResponce(sender, 401, false, 'No file uploaded'))
	}

	try {
		const avatarUrl = `/uploads/${file.filename}`
		await pool.execute('UPDATE user SET avatar_url = ? WHERE id = ?', [avatarUrl, user.id])

		//TODO: brodcast to all family members that the user has updated their avatar.

		return res.json(apiResponce(sender, 200, true, 'Avatar updated successfully', { avatarUrl }))
	} catch (err) {
		console.error(err)
		return res.json(apiResponce(sender, 500, false, 'Internal server error'))
	}
})

///////////////////////////
/// DELETE USER ACCOUNT ///
///////////////////////////
// #region DELETE /self
/**
 * Deletes the current authenticated user's account or another user's account if the authenticated user is a parent.
 *
 * @route DELETE /api/user/self
 * @middleware authenticate
 * @param {string} [userId] - The ID of the user to delete (optional, only for parents).
 * @returns {Object} A message indicating the result of the operation.
 * @throws {401} If the user is not authenticated or not authorized to delete the specified user.
 * @throws {404} If the user to be deleted is not found in the database.
 * @throws {500} If there is an internal server error while deleting the user's account.
 */
router.delete('/self', authenticate, async (req: Request, res: Response) => {
	const sender = 'DELETE_USER_SELF'

	const user = req.user
	if (!user) return res.json(apiResponce(sender, 400, false, 'You are not authenticated.'))

	const force = req.body.force === true

	if (user.role === 'student') {
		if (force) {
			await pool.execute('DELETE FROM user WHERE id = ?', [user.id])
			// TODO: Broadcast to all other family members that the user has left the family.
			// TODO: Broadcast to all other user sessions that the user has been deleted and logged out.
			return res.json(apiResponce(sender, 250, true, 'User account deleted successfully.'))
		} else {
			return res.json(
				apiResponce(
					sender,
					401,
					false,
					'You are not authorized to delete your account. Please contact a parent to delete your account.'
				)
			)
		}
	}

	try {
		const otherFamilyMembers = await pool
			.query('SELECT id, role, isAdmin, createdAt FROM user WHERE familyId = ? AND id != ?', [user.familyId, user.id])
			.then(res => res[0] as { id: string; role: string; isAdmin: boolean; createdAt: Date }[])

		// If there are no other family members, delete the family as well.
		if (otherFamilyMembers.length === 0) {
			// If there are no other family members, delete the family as well.
			await pool.execute('DELETE FROM family WHERE id = ?', [user.familyId])
			await pool.execute('DELETE FROM user WHERE id = ?', [user.id])

			// TODO: Broadcast to all other user sessions that the user has been deleted and logged out.

			return res.json(apiResponce(sender, 200, true, 'User account and family deleted successfully.'))
		}

		// If you are not an admin, you can delete your account without issue.
		if (!user.isAdmin) {
			await pool.execute('DELETE FROM user WHERE id = ?', [user.id])

			// TODO: Broadcast to all other family members that the user has left the family.
			// TODO: Broadcast to all other user sessions that the user has been deleted and logged out.

			return res.json(apiResponce(sender, 201, true, 'User account deleted successfully.'))
		}

		// If there are other parents that are also admins, you can delete your account without issue.
		if (otherFamilyMembers.some(member => member.role === 'parent' && member.isAdmin)) {
			await pool.execute('DELETE FROM user WHERE id = ?', [user.id])

			// TODO: Broadcast to all other family members that the user has left the family.
			// TODO: Broadcast to all other user sessions that the user has been deleted and logged out.

			return res.json(apiResponce(sender, 202, true, 'User account deleted successfully.'))
		}

		// If there are other parents that are not admins, you must make one of them an admin before you can delete your account.
		if (otherFamilyMembers.some(member => member.role === 'parent' && !member.isAdmin)) {
			const nextParent = otherFamilyMembers
				.filter(member => member.role === 'parent' && !member.isAdmin)
				.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0]

			await pool.execute('UPDATE user SET isAdmin = true WHERE id = ?', [nextParent.id])

			// TODO: Broadcast to all family members that the next parent has been made an admin.

			await pool.execute('DELETE FROM user WHERE id = ?', [user.id])

			// TODO: Broadcast to all other family members that the user has left the family.
			// TODO: Broadcast to all other user sessions that the user has been deleted and logged out.

			return res.json(apiResponce(sender, 203, true, 'User account deleted successfully. The next parent has been made an admin.'))
		}

		if (force) {
			// No other parents exist, so you must delete the family and all its students before you can delete your account.

			await pool.execute('DELETE FROM user WHERE familyId = ?', [user.familyId])
			await pool.execute('DELETE FROM family WHERE id = ?', [user.familyId])

			// TODO: Broadcast to all other user sessions that the user has been deleted and logged out.
			// TODO: Broadcast to all family members that they have been deleted and logged out.

			return res.json(apiResponce(sender, 251, true, 'User account and family deleted successfully.'))
		} else {
			return res.json(
				apiResponce(
					sender,
					402,
					false,
					'You are the only parent in the family. To delete your account, you must force delete your account, which will also delete the family and all its students.'
				)
			)
		}
	} catch (err) {
		console.error(err)
		return res.json(apiResponce(sender, 500, false, 'Internal server error'))
	}
})

//////////////////////////////
/// DELETE STUDENT ACCOUNT ///
//////////////////////////////
// #region DELETE /student/:id
/**
 * Deletes a student account by ID. Only parents can delete student accounts.
 *
 * @route DELETE /api/user/student/:id
 * @middleware authenticate
 * @param {string} id - The ID of the student to delete.
 * @returns {Object} A message indicating the result of the operation.
 * @throws {401} If the user is not authenticated or not authorized to delete the student account.
 * @throws {404} If the student account is not found in the database.
 * @throws {500} If there is an internal server error while deleting the student account.
 */
router.delete('/student/:id', authenticate, async (req: Request, res: Response) => {
	const sender = 'DELETE_USER_STUDENT'

	const user = req.user
	if (!user) return res.json(apiResponce(sender, 400, false, 'You are not authenticated.'))

	if (user.role !== 'parent') {
		return res.json(apiResponce(sender, 401, false, 'You are not authorized to delete student accounts.'))
	}

	const studentId = req.params.id
	if (!studentId) return res.json(apiResponce(sender, 400, false, 'Student ID is required.'))

	try {
		const student = (
			await pool
				.query('SELECT * FROM user WHERE id = ? AND familyId = ? AND role = ?', [studentId, user.familyId, 'student'])
				.then(res => res[0] as User[])
		)[0]

		if (!student) {
			return res.json(apiResponce(sender, 404, false, 'Student not found.'))
		}

		await pool.execute('DELETE FROM user WHERE id = ?', [studentId])

		// TODO: Broadcast to all family members that the student has been deleted.
		// TODO: Broadcast to all other student sessions that the student has been deleted and logged out.

		return res.json(apiResponce(sender, 200, true, 'Student account deleted successfully.'))
	} catch (err) {
		console.error(err)
		return res.json(apiResponce(sender, 500, false, 'Internal server error'))
	}
})

export default router
