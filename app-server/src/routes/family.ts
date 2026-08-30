import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

import pool from '../database/config'
import { authenticate } from '../middleware/auth'
import { Family, FamilyMember } from '../utils/types'

const router = Router()
router.use(authenticate)

///////////////////////////////////////
/// GET FAMILY MEMBERS BY FAMILY ID ///
///////////////////////////////////////
// #region GET /members/familyId
/**
 * Retrieves the family members for a given family ID.
 *
 * @route GET /api/family/byId/:familyId
 * @middleware authenticate
 * @param {string} familyId - The ID of the family to retrieve members for.
 * @returns {Object} An object containing the family information and its members.
 * @throws {400} If the family ID is not provided.
 * @throws {401} If the user is not authenticated.
 * @throws {403} If the user is not a member of the specified family.
 * @throws {404} If the family is not found or has no members.
 * @throws {500} If there is an internal server error while fetching the family members.
 */
router.get('/byId/:familyId', authenticate, async (req: Request, res: Response) => {
	const user = req.user
	if (!user) return res.status(401).json({ message: 'Unauthorized' })

	const { familyId } = req.params
	if (!familyId) return res.status(400).json({ message: 'Family ID is required' })

	try {
		// Fetch the family data for the given familyId.
		const family = (await pool.query('SELECT * FROM family WHERE id = ?', [familyId]).then(res => res[0] as Family[]))[0]
		if (!family) return res.status(404).json({ message: 'Family not found' })

		// Fetch all family members for the given familyId.
		const members = await pool
			.query('SELECT * FROM view_family_member WHERE familyId = ?', [familyId])
			.then(res => res[0] as FamilyMember[])

		if (members.length === 0) {
			// If no members are found, delete the family and return a 404 response.
			pool.execute('DELETE FROM family WHERE id = ?', [familyId])

			return res.status(404).json({ message: 'No members found for this family' })
		}

		const isUserInFamily = members.some(m => m.userId === user.id)
		if (!isUserInFamily) {
			return res.status(403).json({ message: 'You are not a member of this family' })
		}

		return res.json({ family, members })
	} catch (err) {
		console.error(err)
		return res.status(500).json({ message: 'Internal server error' })
	}
})

/////////////////////////////////////
/// GET FAMILIES FOR CURRENT USER ///
/////////////////////////////////////
// #region GET /self
/**
 * Retrieves the families associated with the currently authenticated user.
 *
 * @route GET /api/family/for-user
 * @middleware authenticate
 * @returns {Object} An object containing the families associated with the user.
 * @throws {401} If the user is not authenticated.
 * @throws {500} If there is an internal server error while fetching the family.
 */
router.get('/for-user', authenticate, async (req: Request, res: Response) => {
	const user = req.user
	if (!user) return res.status(401).json({ message: 'Unauthorized' })

	try {
		const families = await pool
			.query('SELECT * FROM family WHERE id IN (SELECT familyId FROM family_member WHERE userId = ?)', [user.id])
			.then(res => res[0] as Family[])

		return res.json(families)
	} catch (err) {
		console.error(err)
		return res.status(500).json({ message: 'Internal server error' })
	}
})

///////////////////////////
/// CREATE A NEW FAMILY ///
///////////////////////////
// #region PUT /create
/**
 * Creates a new family and associates the currently authenticated user as the owner.
 *
 * @route PUT /api/family/create
 * @middleware authenticate
 * @param {string} name - The name of the new family.
 * @returns {Object} An object containing the newly created family's information.
 * @throws {400} If the family name is not provided or is invalid.
 * @throws {401} If the user is not authenticated.
 * @throws {500} If there is an internal server error while creating the family.
 */
router.put('/create', authenticate, async (req: Request, res: Response) => {
	const user = req.user
	if (!user) return res.status(401).json({ message: 'Unauthorized' })

	if (!req.body) return res.status(400).json({ message: 'Family name is required' })

	if (typeof req.body !== 'string') return res.status(400).json({ message: 'Family name must be a string' })

	const name = req.body.trim()

	if (name.length < 3) return res.status(400).json({ message: 'Family name must be at least 3 characters long' })

	if (name.length > 50) return res.status(400).json({ message: 'Family name must be at most 50 characters long' })

	try {
		const id = uuidv4()
		const joinCode = uuidv4()

		await pool.execute('INSERT INTO family (id, name, ownerId, joinCode) VALUES (?, ?, ?, ?)', [id, name, user.id, joinCode])

		await pool.execute('INSERT INTO family_member (id, familyId, userId) VALUES (?, ?, ?)', [uuidv4(), id, user.id])

		return res.status(201).json({ id, name, ownerId: user.id, joinCode })
	} catch (err) {
		console.error(err)
		return res.status(500).json({ message: 'Internal server error' })
	}
})

///////////////////////////////
/// JOIN AN EXISTING FAMILY ///
///////////////////////////////
// #region PUT /join
/**
 * Allows the currently authenticated user to join an existing family using a join code.
 *
 * @route PUT /api/family/join
 * @middleware authenticate
 * @param {string} joinCode - The unique join code for the family to join.
 * @returns {Object} An object containing the family information and a success message.
 * @throws {400} If the join code is not provided or is invalid.
 * @throws {401} If the user is not authenticated.
 * @throws {404} If the family with the given join code is not found.
 * @throws {500} If there is an internal server error while joining the family.
 */
router.put('/join', authenticate, async (req: Request, res: Response) => {
	const user = req.user
	if (!user) return res.status(401).json({ message: 'Unauthorized' })

	const joinCode = req.body.joinCode
	if (!joinCode) return res.status(400).json({ message: 'Join code is required' })

	try {
		const family = (await pool.query('SELECT * FROM family WHERE joinCode = ?', [joinCode]).then(res => res[0] as Family[]))[0]
		if (!family) return res.status(404).json({ message: 'Family not found' })

		const existingMember = (
			await pool
				.query('SELECT * FROM family_member WHERE familyId = ? AND userId = ?', [family.id, user.id])
				.then(res => res[0] as FamilyMember[])
		)[0]
		if (existingMember) return res.status(400).json({ message: 'You are already a member of this family' })

		await pool.execute('INSERT INTO family_member (id, familyId, userId) VALUES (?, ?, ?)', [uuidv4(), family.id, user.id])

		// TODO: Broadcast to all family members that a new member has joined the family.

		return res.status(200).json({ message: 'Successfully joined the family', family })
	} catch (err) {
		console.error(err)
		return res.status(500).json({ message: 'Internal server error' })
	}
})

//////////////////////////
/// UPDATE FAMILY NAME ///
//////////////////////////
// #region PATCH /name
/**
 * Updates the name of an existing family.
 *
 * @route PATCH /api/family/update-name
 * @middleware authenticate
 * @param {string} familyId - The ID of the family to update
 * @param {string} newName - The new name for the family
 * @returns {Object} An object containing the updated family name and a success message.
 * @throws {400} If the family ID or new name is not provided or is invalid.
 * @throws {401} If the user is not authenticated.
 * @throws {403} If the user is not the owner of the family.
 * @throws {404} If the family with the given ID is not found.
 * @throws {500} If there is an internal server error while updating the family name.
 */
router.patch('/name', authenticate, async (req: Request, res: Response) => {
	const user = req.user
	if (!user) return res.status(401).json({ message: 'Unauthorized' })

	const familyId = req.body.familyId
	if (!familyId) return res.status(400).json({ message: 'Family ID is required' })

	if (!req.body.newName) return res.status(400).json({ message: 'New family name is required' })

	if (typeof req.body.newName !== 'string') return res.status(400).json({ message: 'New family name must be a string' })

	const newName = req.body.newName.trim()

	if (newName.length < 3) return res.status(400).json({ message: 'Family name must be at least 3 characters long' })

	if (newName.length > 50) return res.status(400).json({ message: 'Family name must be at most 50 characters long' })

	try {
		const family = (await pool.query('SELECT * FROM family WHERE id = ?', [familyId]).then(res => res[0] as Family[]))[0]
		if (!family) return res.status(404).json({ message: 'Family not found' })

		if (family.ownerId !== user.id) return res.status(403).json({ message: 'Only the family owner can update the family name' })

		await pool.execute('UPDATE family SET name = ? WHERE id = ?', [newName, family.id])

		// TODO: Broadcast to all family members that the family name has been updated.

		return res.status(200).json({ message: 'Family name updated successfully', newName })
	} catch (err) {
		console.error(err)
		return res.status(500).json({ message: 'Internal server error' })
	}
})

///////////////////////////////
/// UPDATE FAMILY JOIN CODE ///
///////////////////////////////
// #region PATCH /join-code
/**
 * Generates a new join code for a family.
 *
 * @route PATCH /api/family/join-code
 * @middleware authenticate
 * @param {string} familyId - The ID of the family to update
 * @returns {Object} An object containing the updated join code and a success message.
 * @throws {400} If the family ID is not provided or is invalid.
 * @throws {401} If the user is not authenticated.
 * @throws {403} If the user is not the owner of the family.
 * @throws {404} If the family with the given ID is not found.
 * @throws {500} If there is an internal server error while updating the join code.
 */
router.patch('/join-code', authenticate, async (req: Request, res: Response) => {
	const user = req.user
	if (!user) return res.status(401).json({ message: 'Unauthorized' })

	const familyId = req.body.familyId
	if (!familyId) return res.status(400).json({ message: 'Family ID is required' })

	const newJoinCode = uuidv4()

	try {
		const family = (
			await pool.query('SELECT * FROM family WHERE id = ? AND ownerId = ?', [familyId, user.id]).then(res => res[0] as Family[])
		)[0]
		if (!family) return res.status(404).json({ message: 'Family not found' })

		if (family.ownerId !== user.id) return res.status(403).json({ message: 'Only the family owner can update the join code' })

		await pool.execute('UPDATE family SET joinCode = ? WHERE id = ?', [newJoinCode, family.id])

		// TODO: Broadcast to all family members that the join code has been updated.

		return res.status(200).json({ message: 'Join code updated successfully', newJoinCode })
	} catch (err) {
		console.error(err)
		return res.status(500).json({ message: 'Internal server error' })
	}
})

////////////////////////////////
/// LEAVE AN EXISTING FAMILY ///
////////////////////////////////
// #region POST /leave
/**
 * Allows the currently authenticated user to leave an existing family.
 *
 * @route POST /api/family/leave
 * @middleware authenticate
 * @param {string} familyId - The ID of the family to leave.
 * @param {string} newOwnerId - The ID of the new owner (if the current user is the owner and there are other parents). (Optional)
 * @returns {Object} An object containing a success message and, if applicable, the new owner ID.
 * @throws {400} If the family ID is not provided or is invalid.
 * @throws {401} If the user is not authenticated.
 * @throws {403} If the user is not a member of the specified family.
 * @throws {404} If the family with the given ID is not found.
 * @throws {500} If there is an internal server error while leaving the family.
 */
router.post('/leave', authenticate, async (req: Request, res: Response) => {
	const user = req.user
	if (!user) return res.status(401).json({ message: 'Unauthorized' })

	const familyId = req.body.familyId
	if (!familyId) return res.status(400).json({ message: 'Family ID is required' })

	try {
		const family = (await pool.query('SELECT * FROM family WHERE id = ?', [familyId]).then(res => res[0] as Family[]))[0]
		if (!family) return res.status(404).json({ message: 'Family not found' })

		const existingMember = (
			await pool
				.query('SELECT * FROM family_member WHERE familyId = ? AND userId = ?', [family.id, user.id])
				.then(res => res[0] as FamilyMember[])
		)[0]
		if (!existingMember) return res.status(400).json({ message: 'You are not a member of this family' })

		if (family.ownerId === user.id) {
			const otherAdults = await pool
				.query(
					'SELECT u.id AS userId FROM family_member AS fm JOIN view_user AS u ON fm.userId = u.id WHERE fm.familyId = ? AND u.role = ? AND fm.userId != ? ORDER BY fm.createdAt ASC',
					[family.id, 'parent', user.id]
				)
				.then(res => res[0] as any[])

			if (otherAdults.length === 0) {
				pool.execute('DELETE FROM family WHERE id = ?', [family.id])
				pool.execute('DELETE FROM family_member WHERE familyId = ?', [family.id])

				// TODO: Broadcast to all other user sessions that the family has been deleted.

				return res.status(200).json({ message: 'Family deleted as you were the only parent.' })
			}

			const newOwnerId = (() => {
				if (req.body.newOwnerId) {
					const isValidNewOwner = otherAdults.some(adult => adult.userId === req.body.newOwnerId)
					return isValidNewOwner ? req.body.newOwnerId : null
				} else {
					return otherAdults[0].userId
				}
			})()

			if (!newOwnerId) {
				return res
					.status(400)
					.json({ message: 'The specified new owner ID is not valid. Please provide a valid parent ID from the family.' })
			}

			await pool.execute('UPDATE family SET ownerId = ? WHERE id = ?', [newOwnerId, family.id])
			await pool.execute('DELETE FROM family_member WHERE familyId = ? AND userId = ?', [family.id, user.id])

			// TODO: Broadcast to all family members that the ownership has been transferred and that the user has left the family.
			// TODO: Broadcast to the new owner that they have been assigned as the new owner of the family.
			// TODO: Broadcast to all family members that the user has left the family.
			// TODO: Broadcast to the user that they have left the family.

			return res.status(200).json({ message: 'You have left the family and ownership has been transferred.', newOwnerId })
		} else {
			await pool.execute('DELETE FROM family_member WHERE familyId = ? AND userId = ?', [family.id, user.id])

			// TODO: Broadcast to all family members that the user has left the family.
			// TODO: Broadcast to the user that they have left the family.

			return res.status(200).json({ message: 'You have left the family.' })
		}
	} catch (err) {
		console.error(err)
		return res.status(500).json({ message: 'Internal server error' })
	}
})

//////////////////////////////
/// REMOVE A FAMILY MEMBER ///
//////////////////////////////
// #region POST /remove-member
/**
 * Allows the currently authenticated user (family owner) to remove a member from the family.
 *
 * @route POST /api/family/remove-member
 * @middleware authenticate
 * @param {string} familyId - The ID of the family from which to remove the member.
 * @param {string} targetId - The ID of the member to be removed from the family.
 * @returns {Object} An object containing a success message.
 * @throws {400} If the family ID or member ID is not provided or is invalid.
 * @throws {401} If the user is not authenticated.
 * @throws {403} If the user is not the owner of the family.
 * @throws {404} If the family or member with the given IDs is not found.
 * @throws {500} If there is an internal server error while removing the member.
 */
router.post('/remove-member', authenticate, async (req: Request, res: Response) => {
	const user = req.user
	if (!user) return res.status(401).json({ message: 'Unauthorized' })

	const familyId = req.body.familyId
	if (!familyId) return res.status(400).json({ message: 'Family ID is required' })

	const targetId = req.body.targetId
	if (!targetId) return res.status(400).json({ message: 'Target ID (the ID of the member to be removed) is required' })

	if (targetId === user.id)
		return res.status(400).json({ message: 'You cannot remove yourself. To leave the family, use the leave family option instead.' })

	try {
		const family = (await pool.query('SELECT * FROM family WHERE id = ?', [familyId]).then(res => res[0] as Family[]))[0]
		if (!family) return res.status(404).json({ message: 'Family not found' })

		if (family.ownerId !== user.id) return res.status(403).json({ message: 'Only the family owner can remove members' })

		const existingMember = (
			await pool
				.query('SELECT * FROM family_member WHERE familyId = ? AND userId = ?', [family.id, targetId])
				.then(res => res[0] as FamilyMember[])
		)[0]
		if (!existingMember) return res.status(400).json({ message: 'The specified user is not a member of this family' })

		await pool.execute('DELETE FROM family_member WHERE familyId = ? AND userId = ?', [family.id, targetId])

		// TODO: Broadcast to all family members that the member has been removed from the family.
		// TODO: Broadcast to the removed member that they have been removed from the family.

		return res.status(200).json({ message: 'Member removed from the family.' })
	} catch (err) {
		console.error(err)
		return res.status(500).json({ message: 'Internal server error' })
	}
})

///////////////////////
/// DELETE A FAMILY ///
///////////////////////
// #region DELETE /family
/**
 * Deletes an existing family and all its members. Only the family owner can perform this action.
 *
 * @route DELETE /api/family/byId/:familyId
 * @middleware authenticate
 * @param {string} familyId - The ID of the family to delete.
 * @returns {Object} An object containing a success message.
 * @throws {400} If the family ID is not provided or is invalid.
 * @throws {401} If the user is not authenticated.
 * @throws {403} If the user is not the owner of the family.
 * @throws {404} If the family with the given ID is not found.
 * @throws {500} If there is an internal server error while deleting the family.
 */
router.delete('/byId/:familyId', authenticate, async (req: Request, res: Response) => {
	const user = req.user
	if (!user) return res.status(401).json({ message: 'Unauthorized' })

	const familyId = req.params.familyId
	if (!familyId) return res.status(400).json({ message: 'Family ID is required' })

	try {
		const family = (await pool.query('SELECT * FROM family WHERE id = ?', [familyId]).then(res => res[0] as Family[]))[0]
		if (!family) return res.status(404).json({ message: 'Family not found' })

		if (family.ownerId !== user.id) return res.status(403).json({ message: 'Only the family owner can delete the family' })

		await pool.execute('DELETE FROM family WHERE id = ?', [family.id])
		await pool.execute('DELETE FROM family_member WHERE familyId = ?', [family.id])

		// TODO: Broadcast to all family members that the family has been deleted.
		// TODO: Broadcast to all other user sessions that the family has been deleted.

		return res.status(200).json({ message: 'Family deleted successfully' })
	} catch (err) {
		console.error(err)
		return res.status(500).json({ message: 'Internal server error' })
	}
})

export default router
