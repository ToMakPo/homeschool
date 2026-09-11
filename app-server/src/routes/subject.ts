import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

import pool from '../database/config'
import { authenticate } from '../middleware/auth'
import { apiResponse } from '../utils/api-response'
import { Subject } from '../utils/types'
import { validateEnum, validateName, validatePassword, validateString, validateUsername, ValidationResult } from '../utils/validation'
import { cleanUserRecords } from './user'

const router = Router()
router.use(authenticate)

/////////////////////////////////
/// GET SUBJECTS BY FAMILY ID ///
/////////////////////////////////
// #region GET /subject
/**
 * Retrieves the subjects for a given family ID.
 *
 * @route GET /api/subject
 * @middleware authenticate
 * @returns {Subject[]} An array of subjects belonging to the user's family.
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
	const sender = 'GET_SUBJECTS_BY_FAMILY_ID'

	const user = req.user
	if (!user) return res.json(apiResponse(sender, 400, false, 'You are not authenticated.'))

	try {
		// Fetch all family members for the given familyId.
		const subjects = await pool.query('SELECT * FROM subject WHERE familyId = ?', [user.familyId]).then((res) => res[0] as Subject[])

		return res.json(apiResponse(sender, 200, true, 'Subjects fetched successfully.', { subjects }))
	} catch (err) {
		console.error(err)
		return res.json(apiResponse(sender, 500, false, 'Internal server error'))
	}
})

/////////////////////////////////
/// CREATE SUBJECT FOR FAMILY ///
/////////////////////////////////
// #region POST /subject
/**
 * Creates a new subject for the user's family.
 *
 * @route POST /api/subject
 * @middleware authenticate
 * @param {string} name - The name of the subject.
 * @param {string} [icon] - An optional icon representing the subject.
 * @param {string} [description] - An optional description of the subject.
 * @param {string} [color] - An optional color associated with the subject.
 * @returns {Subject} The newly created subject.
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
	const sender = 'CREATE_SUBJECT_FOR_FAMILY'

	const user = req.user
	if (!user) return res.json(apiResponse(sender, 400, false, 'You are not authenticated.'))

	if (!user.isAdmin) return res.json(apiResponse(sender, 401, false, 'Only family admin can create family members.'))

	try {
		/// VALIDATE INPUTS ///

		const validations: ValidationResult<any>[] = []
		const params = req.body

		const nameValidation = await validateString(params.name, 'Name', true, 1, 255)
		const name = nameValidation.value as string
		validations.push(nameValidation)

		const iconValidation = await validateString(params.icon, 'Icon', true, 0, 255, true)
		const icon = iconValidation.value as string | null
		validations.push(iconValidation)

		const descriptionValidation = await validateString(params.description, 'Description', true, 0, undefined, true)
		const description = descriptionValidation.value as string | null
		validations.push(descriptionValidation)

		const colorValidation = await validateString(params.color, 'Color', true, 0, 255, true)
		const color = colorValidation.value as string | null
		validations.push(colorValidation)

		if (validations.some((v) => !v.passed)) return res.json(apiResponse(sender, 402, false, 'Validation failed', { validations }))

		/// CREATE NEW SUBJECT ///

		const subjectId = uuidv4()
		const familyId = user.familyId

		await pool.query('INSERT INTO subject (id, familyId, name, icon, description, color) VALUES (?, ?, ?, ?, ?, ?)', [
			subjectId,
			familyId,
			name,
			icon,
			description,
			color
		])

		const newSubject = (await pool.query('SELECT * FROM subject WHERE id = ?', [subjectId]).then((res) => res[0] as Subject[]))[0]
		if (!newSubject) return res.json(apiResponse(sender, 501, false, 'Failed to retrieve newly created subject.'))

		// TODO: Broadcast to all family members that a new subject was added to the family.

		return res.json(apiResponse(sender, 201, true, 'A new subject was created.', { subject: newSubject }))
	} catch (err) {
		console.error(err)
		return res.json(apiResponse(sender, 500, false, 'Internal server error'))
	}
})

//////////////////////
/// UPDATE SUBJECT ///
//////////////////////
// #region PATCH /subject
/**
 * Updates an existing subject. Only family admins can perform this action.
 *
 * @route PATCH /api/subject/:id
 * @middleware authenticate
 * @param {string} id - The ID of the subject to update.
 * @param {string} [name] - The new name of the subject.
 * @param {string} [icon] - An optional new icon representing the subject.
 * @param {string} [description] - An optional new description of the subject.
 * @param {string} [color] - An optional new color associated with the subject.
 * @returns {Subject} The updated subject.
 */
router.patch('/:id', authenticate, async (req: Request, res: Response) => {
	const sender = 'UPDATE_SUBJECT'

	const user = req.user
	if (!user) return res.json(apiResponse(sender, 400, false, 'You are not authenticated.'))

	if (!user.isAdmin) return res.json(apiResponse(sender, 401, false, 'Only family admin can update subjects.'))

	const subjectId = req.params.id || req.body.id
	if (!subjectId) return res.json(apiResponse(sender, 402, false, 'No subject ID was provided.'))

	try {
		const validations: ValidationResult<any>[] = []
		const updates: Partial<Subject> = req.body.updates

		const newValues: Partial<Omit<Subject, 'id' | 'familyId'>> = {}

		if (updates.name !== undefined) {
			const nameValidation = await validateString(updates.name, 'Name', true, 1, 255)
			newValues.name = nameValidation.value as string
			validations.push(nameValidation)
		}

		if (updates.icon !== undefined) {
			const iconValidation = await validateString(updates.icon, 'Icon', true, 0, 255, true)
			newValues.icon = iconValidation.value as string | null
			validations.push(iconValidation)
		}

		if (updates.description !== undefined) {
			const descriptionValidation = await validateString(updates.description, 'Description', true, 0, undefined, true)
			newValues.description = descriptionValidation.value as string | null
			validations.push(descriptionValidation)
		}

		if (updates.color !== undefined) {
			const colorValidation = await validateString(updates.color, 'Color', true, 0, 255, true)
			newValues.color = colorValidation.value as string | null
			validations.push(colorValidation)
		}

		if (validations.some((v) => !v.passed)) return res.json(apiResponse(sender, 403, false, 'Validation failed', { validations }))

		if (Object.keys(newValues).length === 0) return res.json(apiResponse(sender, 404, false, 'No valid fields to update'))

		const setClause = Object.keys(newValues)
			.map((key) => `${key} = ?`)
			.join(', ')
		const values = Object.values(newValues)

		await pool.query(`UPDATE subject SET ${setClause} WHERE id = ?`, [...values, subjectId])
		const updatedSubject = (await pool.query('SELECT * FROM subject WHERE id = ?', [subjectId]).then((res) => res[0] as Subject[]))[0]

		// TODO: Broadcast to all family members that the subject was updated.

		return res.json(apiResponse(sender, 200, true, 'Subject updated successfully.', { subject: updatedSubject }))
	} catch (err) {
		console.error(err)
		return res.json(apiResponse(sender, 500, false, 'Internal server error'))
	}
})

//////////////////////
/// DELETE SUBJECT ///
//////////////////////
// #route DELETE /subject
/**
 * Delete a subject by its ID.
 *
 * @param id The ID of the subject to delete.
 * @returns A response indicating the success or failure of the deletion.
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
	const sender = 'DELETE_SUBJECT'

	const user = req.user
	if (!user) return res.json(apiResponse(sender, 400, false, 'You are not authenticated.'))

	if (!user.isAdmin) return res.json(apiResponse(sender, 401, false, 'Only family admin can delete subjects.'))

	const subjectId = req.params.id
	if (!subjectId) return res.json(apiResponse(sender, 402, false, 'No subject ID was provided.'))

	try {
		const subjectExists = (await pool.query('SELECT * FROM subject WHERE id = ?', [subjectId]).then((res) => res[0] as Subject[]))[0]
		if (!subjectExists) return res.json(apiResponse(sender, 403, false, 'Subject not found.'))

		await pool.query('DELETE FROM subject WHERE id = ?', [subjectId])

		// TODO: Broadcast to all family members that the subject was deleted.

		return res.json(apiResponse(sender, 200, true, 'Subject deleted successfully.'))
	} catch (err) {
		console.error(err)
		return res.json(apiResponse(sender, 500, false, 'Internal server error'))
	}
})

export default router
