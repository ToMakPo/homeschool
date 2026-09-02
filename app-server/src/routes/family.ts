import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

import pool from '../database/config'
import { authenticate } from '../middleware/auth'
import { apiResponce } from '../utils/api-responces'
import { Family, User } from '../utils/types'
import { validateEnum, validateName, validatePassword, validateString, validateUsername, ValidationResult } from '../utils/validation'

const router = Router()
router.use(authenticate)

///////////////////////////////////////
/// GET FAMILY MEMBERS BY FAMILY ID ///
///////////////////////////////////////
// #region GET /members/familyId
/**
 * Retrieves the family members for a given family ID.
 *
 * @route GET /api/family/
 * @middleware authenticate
 * @param {string} familyId - The ID of the family to retrieve members for.
 * @returns {Object} An object containing the family information and its members.
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
	const sender = 'GET_FAMILY_BY_FAMILY_ID'

	const user = req.user
	if (!user) return res.json(apiResponce(sender, 400, false, 'You are not authenticated.'))

	try {
		// Fetch the family data for the given familyId.
		const family = (await pool.query('SELECT * FROM family WHERE id = ?', [user.familyId]).then((res) => res[0] as Family[]))[0]

		// Fetch all family members for the given familyId.
		const members = await pool.query('SELECT * FROM view_user WHERE familyId = ?', [user.familyId]).then((res) => res[0] as User[])

		return res.json(apiResponce(sender, 200, true, 'Family fetched successfully.', { family, members }))
	} catch (err) {
		console.error(err)
		return res.json(apiResponce(sender, 500, false, 'Internal server error'))
	}
})

//////////////////////////
/// UPDATE FAMILY NAME ///
//////////////////////////
// #region PATCH /name
/**
 * Updates the name of an existing family.
 *
 * @route PATCH /api/family/name
 * @middleware authenticate
 * @param {string} familyId - The ID of the family to update
 * @param {string} newName - The new name for the family
 * @returns {Object} An object containing the updated family name and a success message.
 */
router.patch('/name', authenticate, async (req: Request, res: Response) => {
	const sender = 'PATCH_FAMILY_NAME'

	const user = req.user
	if (!user) return res.json(apiResponce(sender, 400, false, 'You are not authenticated.'))

	if (!user.isAdminX) return res.json(apiResponce(sender, 401, false, 'You do not have permision to update the family.'))

	try {
		const nameValidation = await validateString(req.body.params.name, 'Family Name', true, 3, 50)
		if (!nameValidation.passed) return res.json(apiResponce(sender, 402, false, 'Validation failed', { validations: [nameValidation] }))
		const newName = nameValidation.value!

		await pool.execute('UPDATE family SET name = ? WHERE id = ?', [newName, user.familyId])

		// TODO: Broadcast to all family members that the family name has been updated.

		return res.json(apiResponce(sender, 200, true, 'Family name updated successfully', { newName }))
	} catch (err) {
		console.error(err)
		return res.json(apiResponce(sender, 500, false, 'Internal server error'))
	}
})

///////////////////////
/// DELETE A FAMILY ///
///////////////////////
// #region DELETE /family
/**
 * Deletes an existing family and all its members. Only the family owner can perform this action.
 *
 * @route DELETE /api/family
 * @middleware authenticate
 * @param {string} familyId - The ID of the family to delete.
 * @returns {Object} An object containing a success message.
 */
router.delete('/', authenticate, async (req: Request, res: Response) => {
	const sender = 'DELETE_FAMILY'

	const user = req.user
	if (!user) return res.json(apiResponce(sender, 400, false, 'You are not authenticated.'))

	if (!user.isOwner) return res.json(apiResponce(sender, 401, false, 'Only the owner of the family group can delete the family group.'))

	try {
		await pool.execute('DELETE FROM family WHERE id = ?', [user.familyId])
		await pool.execute('DELETE FROM user WHERE familyId = ?', [user.familyId])

		// TODO: Broadcast to all family members that the family has been deleted.
		// TODO: Broadcast to all other user sessions that the family has been deleted.

		return res.json({ message: 'Family deleted successfully' })
	} catch (err) {
		console.error(err)
		return res.json({ message: 'Internal server error' })
	}
})

////////////////////////////
/// CREATE FAMILY MEMBER ///
////////////////////////////
// #region PUT /creata
router.put('/create', authenticate, async (req: Request, res: Response) => {
	const sender = 'CREATE_FAMILY_MEMBER'

	const user = req.user
	if (!user) return res.json(apiResponce(sender, 400, false, 'You are not authenticated.'))

	if (!user.isAdminX) return res.json(apiResponce(sender, 401, false, 'Only family admin can create family members.'))

	try {
		/// VALIDATE INPUTS ///

		const validations: ValidationResult<any>[] = []
		const params = req.body

		const usernameValidation = await validateUsername(params.username, user.id)
		const username = usernameValidation.value!
		validations.push(usernameValidation)

		const passwordValidation = await validatePassword(params.password, params.confirmation)
		const password = passwordValidation.value!

		const firstNameValidation = await validateName(params.firstName, 'First name', false)
		const firstName = firstNameValidation.value!
		validations.push(firstNameValidation)

		const lastNameValidation = await validateName(params.lastName, 'Last name', false)
		const lastName = lastNameValidation.value!
		validations.push(lastNameValidation)

		const roleValidation = await validateEnum<User['roleX']>(params.roleX, ['admin', 'parent', 'student'], 'Role')
		const role = roleValidation.value!
		validations.push(roleValidation)

		if (validations.some((v) => !v.passed)) return res.json(apiResponce(sender, 401, false, 'Validation failed', { validations }))

		/// CREATE NEW USER

		const userId = uuidv4()
		const hashedPassword = await bcrypt.hash(password!, 10)
		const familyId = user.familyId
		const passwordReset = true

		await pool.query(
			'INSERT INTO user (id, username, hashedPassword, firstName, lastName, familyId, role, passwordReset) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
			[userId, username, hashedPassword, firstName, lastName, familyId, role, passwordReset]
		)

		const newUser = (await pool.query('SELECT * FROM view_user WHERE id = ?', [userId]).then((result) => result[0] as User[]))[0]
		if (!newUser) return res.json(apiResponce(sender, 501, false, 'Failed to retrieve newly created user.'))

		// TODO: Broadcast to all family members that a new member was added to the family.
		// TODO: Once email verification is implemented, send a verification email to the new user.

		return res.json(apiResponce(sender, 200, true, 'A new family member was created.'))
	} catch (err) {
		console.error(err)
		return res.json(apiResponce(sender, 500, false, 'Internal server error'))
	}
})

////////////////////////////
/// DELETE FAMILY MEMBER ///
////////////////////////////
// #region DELETE /member/:id
/**
 * Deletes a member account by ID. Only parents can delete member accounts.
 *
 * @route DELETE /api/family/member/:id
 * @middleware authenticate
 * @param {string} id - The ID of the member to delete.
 * @returns {Object} A message indicating the result of the operation.
 */
router.delete('/member/:id', authenticate, async (req: Request, res: Response) => {
	const sender = 'DELETE_FAMILY_MEMBER'

	const user = req.user
	if (!user) return res.json(apiResponce(sender, 400, false, 'You are not authenticated.'))

	const targetId = req.params.id
	if (!targetId) return res.json(apiResponce(sender, 401, false, 'No member ID was provided.'))

	try {
		const member = (
			await pool.query('SELECT * FROM view_user WHERE id = ? AND familyId = ?', [targetId, user.familyId]).then((res) => res[0] as User[])
		)[0]

		if (!member) return res.json(apiResponce(sender, 402, false, 'Target not found.'))

		if (!user.isParent) return res.json(apiResponce(sender, 403, false, 'You are not permited to remove other users.'))
		if (!user.isAdminX && member.isParent) return res.json(apiResponce(sender, 404, false, 'You are not permited to remove other parents.'))
		if (!user.isOwner && member.isAdminX) return res.json(apiResponce(sender, 405, false, 'You are not permited to remove other admin.'))

		await pool.execute('DELETE FROM user WHERE id = ?', [targetId])

		// TODO: Broadcast to all family members that the member has been deleted.
		// TODO: Broadcast to all other member sessions that the member has been deleted and logged out.

		return res.json(apiResponce(sender, 200, true, 'Target account deleted successfully.'))
	} catch (err) {
		console.error(err)
		return res.json(apiResponce(sender, 500, false, 'Internal server error'))
	}
})

export default router
