import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import pool from '../database/config'

import { authenticate } from '../middleware/auth'
import { upload } from '../middleware/storage'
import { validateName, validatePassword, validateUsername } from '../utils/validation'
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
	if (!req.user) return res.status(401).json({ message: 'Unauthorized' })

	try {
		const results = await pool.query('SELECT * FROM user_view WHERE id = ?', [req.user.id]).then(res => res[0] as User[])
		const user = results[0]
		if (!user) return res.status(404).json({ message: 'User not found' })
		res.json(user)
	} catch (err) {
		console.error(err)
		res.status(500).json({ message: 'Internal server error' })
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
	const user = req.user
	if (!user) return res.status(401).json({ message: 'Unauthorized' })

	const updates: Partial<User> = req.body.updates

	const newValues: Partial<Omit<User, 'id' | 'avatarUrl'>> = {}

	if (updates.username !== undefined) {
		const { valid, message, value } = await validateUsername(updates.username, user.username)
		if (!valid) return res.status(400).json({ message })
		newValues.username = value!
	}

	if (updates.firstName !== undefined) {
		const { valid, message, value } = await validateName(updates.firstName, 'First name')
		if (!valid) return res.status(400).json({ message })
		newValues.firstName = value!
	}

	if (updates.lastName !== undefined) {
		const { valid, message, value } = await validateName(updates.lastName, 'Last name')
		if (!valid) return res.status(400).json({ message })
		newValues.lastName = value!
	}

	if (updates.displayName !== undefined) {
		const { valid, message, value } = await validateName(updates.displayName, 'Display name', true)
		if (!valid) return res.status(400).json({ message })
		newValues.displayName = value!
	}

	if (updates.role !== undefined) {
		if (!['parent', 'student'].includes(updates.role)) {
			return res.status(400).json({ message: 'Role must be either "parent" or "student"' })
		}
		newValues.role = updates.role
	}

	if (Object.keys(newValues).length === 0) {
		return res.status(400).json({ message: 'No valid fields to update' })
	}

	const setClause = Object.keys(newValues)
		.map(key => `${key} = ?`)
		.join(', ')
	const values = Object.values(newValues)

	try {
		await pool.execute(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, user.id])
		const updatedUser = (await pool.query('SELECT * FROM user_view WHERE id = ?', [user.id]).then(res => res[0] as User[]))[0]

		// TODO: Broadcast to all family members that the user has updated their information.

		res.json(updatedUser)
	} catch (err) {
		console.error(err)
		res.status(500).json({ message: 'Internal server error' })
	}
})

////////////////////////////
/// UPDATE USER PASSWORD ///
////////////////////////////
// #region PATCH /password
/**
 * Updates the current authenticated user's password.
 *
 * @route PATCH /api/user/password
 * @middleware authenticate
 * @param {string} currentPassword - The user's current password.
 * @param {string} newPassword - The new password to set.
 * @returns {Object} A message indicating the result of the operation.
 * @throws {400} If the current password is incorrect or the new password is invalid.
 * @throws {401} If the user is not authenticated.
 * @throws {500} If there is an internal server error while updating the password.
 */
router.patch('/password', authenticate, async (req: Request, res: Response) => {
	const user = req.user
	if (!user) return res.status(401).json({ message: 'Unauthorized' })

	const { currentPassword, newPassword } = req.body

	if (!currentPassword) return res.status(400).json({ message: 'Current password is required' })
	if (!newPassword) return res.status(400).json({ message: 'New password is required' })

	const { valid, message, value } = await validatePassword(newPassword)

	if (!valid) return res.status(400).json({ message })

	try {
		const storedHash = await pool.query('SELECT password FROM users WHERE id = ?', [user.id]).then(res => (res[0] as any[])[0].password)

		const isMatch = await bcrypt.compare(currentPassword, storedHash)

		if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' })

		const newHash = await bcrypt.hash(value!, 10)

		await pool.execute('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id])

		return res.json({ message: 'Password changed successfully' })
	} catch (err) {
		console.error(err)
		return res.status(500).json({ message: 'Internal server error' })
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
	const user = req.user
	if (!user) return res.status(401).json({ message: 'Unauthorized' })

	const file = req.file
	if (!file) {
		return res.status(400).json({ message: 'No file uploaded' })
	}

	try {
		const avatarUrl = `/uploads/${file.filename}`
		await pool.execute('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, user.id])

		//TODO: brodcast to all family members that the user has updated their avatar.

		res.status(200).json({ avatarUrl })
	} catch (err) {
		console.error(err)
		res.status(500).json({ message: 'Internal server error' })
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
	const user = req.user
	if (!user) return res.status(401).json({ message: 'Unauthorized' })

	try {
		const familiesOwnedByUser = await pool
			.query('SELECT id FROM family WHERE owner_id = ?', [user.id])
			.then(res => (res[0] as { id: string }[]).map(row => row.id))

		familiesOwnedByUser.forEach(async familyId => {
			// Find the next parent in the family (if any) to transfer ownership to
			const nextParentId = (
				await pool
					.query(
						"SELECT fm.user_id FROM family fm JOIN users u ON fm.user_id = u.id WHERE fm.family_id = ? AND u.role = 'parent' AND fm.user_id != ? ORDER BY fm.created_at ASC LIMIT 1",
						[familyId, user.id]
					)
					.then(res => (res[0] as { user_id: string }[]).map(row => row.user_id))
			)[0]

			if (nextParentId) {
				// If another parent exists, transfer ownership to that parent.
				await pool.execute('UPDATE family SET owner_id = ? WHERE id = ?', [nextParentId, familyId])

				// TODO: broadcast to the family that ownership has changed.
				// TODO: broadcast to the family that the user has left the family.
			} else {
				// If no other parent exists, delete the family and its members.
				await pool.execute('DELETE FROM family WHERE id = ?', [familyId])
				await pool.execute('DELETE FROM family WHERE family_id = ?', [familyId])
			}
		})

		await pool.execute('DELETE FROM users WHERE id = ?', [user.id])

		await pool.execute('DELETE FROM sessions WHERE user_id = ?', [user.id])

		await pool.execute('DELETE FROM family WHERE user_id = ?', [user.id])

		// TODO: Broadcast to all all other user sessions that the user has been deleted and logged out.
		res.status(200).json({ message: 'User account deleted successfully' })
	} catch (err) {
		console.error(err)
		res.status(500).json({ message: 'Internal server error' })
	}
})

export default router
