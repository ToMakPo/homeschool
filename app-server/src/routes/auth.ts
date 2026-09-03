import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

import pool from '../database/config'
import { User } from '../utils/types'
import { authenticate, signToken } from '../middleware/auth'
import { apiResponse } from '../utils/api-response'
import { validateUsername, validatePassword, validateName, ValidationResult, validateBoolean, validateString } from '../utils/validation'
import { cleanUserRecords, formatUser } from './user'

const router = Router()

/////////////////////////
/// REGISTER NEW USER ///
/////////////////////////
// #region POST /register
/**
 * Registers a new user.
 *
 * @route POST api/auth/register
 * @param {string} username - The desired username for the new user.
 * @param {string} password - The desired password for the new user.
 * @param {string} confirmation - The password confirmation for the new user.
 * @param {string} firstName - The first name of the new user.
 * @param {string} lastName - The last name of the new user.
 * @returns {Object} An object containing the newly created user and an access token.
 */
router.post('/register', async (req: Request, res: Response) => {
	const sender = 'POST_AUTH_REGISTER'
	const params = req.body

	try {
		/// VALIDATE INPUTS ///

		const validations = [] as ValidationResult<any>[]

		const usernameValidation = await validateUsername(params.username)
		validations.push(usernameValidation)
		const username = usernameValidation.value!

		const passwordValidation = await validatePassword(params.password, params.confirmation)
		validations.push(passwordValidation)
		const password = passwordValidation.value!

		const firstNameValidation = await validateName(params.firstName, 'First name')
		validations.push(firstNameValidation)
		const firstName = firstNameValidation.value!

		const lastNameValidation = await validateName(params.lastName, 'Last name')
		validations.push(lastNameValidation)
		const lastName = lastNameValidation.value!

		if (validations.some((v) => !v.passed)) return res.json(apiResponse(sender, 400, false, 'Validation failed', { validations }))

		/// CREATE NEW USER

		const familyId = uuidv4()
		const familyName = `${lastName} Family`

		await pool.query('INSERT INTO family (id, name) VALUES (?, ?)', [familyId, familyName])

		const userId = uuidv4()
		const hashedPassword = await bcrypt.hash(password!, 10)
		const role = 'owner'

		await pool.query('INSERT INTO user (id, username, hashedPassword, firstName, lastName, familyId, role) VALUES (?, ?, ?, ?, ?, ?, ?)', [
			userId,
			username,
			hashedPassword,
			firstName,
			lastName,
			familyId,
			role
		])

		const newUser = (await pool.query('SELECT * FROM view_user WHERE id = ?', [userId]).then(cleanUserRecords))[0]
		if (!newUser) return res.json(apiResponse(sender, 501, false, 'Failed to retrieve newly created user.'))

		const { accessToken, expiresAt } = signToken(newUser)

		const queryParams = [uuidv4(), newUser.id, accessToken, expiresAt]
		await pool.query('INSERT INTO session (id, userId, authToken, expiresAt) VALUES (?, ?, ?, ?)', queryParams)

		// TODO: Broadcast to all family members that the user has logged in.
		// TODO: Once email verification is implemented, send a verification email to the new user.

		return res.json(apiResponse(sender, 200, true, 'New user and new family created.', { user: newUser, accessToken }))
	} catch (error) {
		console.error(error)
		return res.json(apiResponse(sender, 500, false, 'An error occurred while creating the user.', error))
	}
})

///////////////////////////
/// LOGIN EXISTING USER ///
///////////////////////////
// #region POST /login
/**
 * Logs in an existing user by validating their credentials and generating a JWT token.
 *
 * @route POST /api/auth/login
 * @param {string} username - The user's username.
 * @param {string} password - The user's password.
 * @param {boolean} rememberMe - Optional flag to indicate if the user wants to stay logged in for an extended period.
 * @returns {Object} An object containing the authenticated user and access token.
 */
router.post('/login', async (req: Request, res: Response) => {
	const sender = 'POST_AUTH_LOGIN'

	const params = req.body

	/// VALIDATE INPUTS

	const validations = [] as ValidationResult<any>[]

	const usernameValidation = await validateString(params.username, 'Username', true)
	validations.push(usernameValidation)
	const username = usernameValidation.value!

	const passwordValidation = await validateString(params.password, 'Password', false)
	validations.push(passwordValidation)
	const password = passwordValidation.value!

	const rememberMeValidation = await validateBoolean(params.rememberMe, 'Remember Me')
	validations.push(rememberMeValidation)
	const rememberMe = rememberMeValidation.value!

	if (validations.some((v) => !v.passed)) return res.json(apiResponse(sender, 400, false, 'Validation failed', { validations }))

	try {
		const loginFailedResponse = apiResponse(sender, 401, false, 'Invalid username or password')

		const record = (
			await pool
				.query('SELECT id, hashedPassword AS hash FROM user WHERE username = ?', [username])
				.then((result) => result[0] as { id: string; hash: string }[])
		)[0]
		if (!record) return res.json(loginFailedResponse)

		const passwordMatch = await bcrypt.compare(password, record.hash)
		if (!passwordMatch) return res.json(loginFailedResponse)

		const user = formatUser((await pool.query('SELECT * FROM view_user WHERE id = ?', [record.id]).then(cleanUserRecords))[0])
		if (!user) return res.json(apiResponse(sender, 501, false, 'Unable to retrieve user after successful login.'))

		/// USER PASSED LOGIN VALIDATION | LOG THE USER IN

		const { accessToken, expiresAt } = signToken(user, rememberMe)

		await pool.query('INSERT INTO session (id, userId, authToken, expiresAt) VALUES (?, ?, ?, ?)', [uuidv4(), user.id, accessToken, expiresAt])

		// TODO: Broadcast to all family members that the user has logged in.

		return res.json(apiResponse(sender, 200, true, 'User was logged in.', { user, accessToken }))
	} catch (error) {
		console.error(error)
		return res.json(apiResponse(sender, 500, false, 'An error occurred while logging in.', error))
	}
})

///////////////////////////////////////
/// LOG USER OUT OF CURRENT SESSION ///
///////////////////////////////////////
// #region POST /logout
/**
 * Logs out the current user from their session by invalidating the JWT token.
 *
 * User must be authenticated to perform this action.
 *
 * @route POST /api/auth/logout
 * @param {string} authToken - The JWT token of the current session to be invalidated.
 * @returns {Object} A message indicating the result of the operation.
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
	const sender = 'POST_AUTH_LOGOUT'

	const user = req.user
	if (!user) return res.json(apiResponse(sender, 400, false, 'User not authenticated'))

	const authHeader = req.headers.authorization
	if (!authHeader?.startsWith('Bearer ')) {
		return res.json(apiResponse(sender, 401, false, 'No token provided'))
	}

	try {
		const token = authHeader.slice(7)
		await pool.query('DELETE FROM session WHERE authToken = ?', [token])

		// TODO: Check if the user is still logged in on any other sessions.
		// If not, broadcast to all family members that the user has logged out.

		return res.json(apiResponse(sender, 200, true, 'Logged out successfully'))
	} catch (error) {
		console.error(error)
		return res.json(apiResponse(sender, 500, false, 'An error occurred while logging out.', error))
	}
})

////////////////////////////////////
/// LOG USER OUT OF ALL SESSIONS ///
////////////////////////////////////
// #region POST /logout-all
/**
 * Logs out the current user from all sessions by invalidating all JWT tokens associated with the user.
 * User must be authenticated to perform this action.
 *
 * @route POST /api/auth/logout-all
 * @param {string} [ignoreToken] - Optional JWT token to ignore during logout (useful for keeping the current session active).
 * @returns {Object} A message indicating the result of the operation.
 */
router.post('/logout-all', authenticate, async (req: Request, res: Response) => {
	const sender = 'POST_AUTH_LOGOUT_ALL'

	const user = req.user
	if (!user) return res.json(apiResponse(sender, 400, false, 'User not authenticated'))

	const ignoreToken = (req.body.ignoreToken as string) || ''

	try {
		await pool.query('DELETE FROM session WHERE userId = ? AND authToken != ?', [user.id, ignoreToken])

		// TODO: If not ignoring the current session, broadcast to all family members that the user has logged out of all sessions.

		return res.json(apiResponse(sender, 200, true, 'Logged out of all sessions successfully'))
	} catch (error) {
		console.error(error)
		return res.json(apiResponse(sender, 500, false, 'An error occurred while logging out of all sessions.', error))
	}
})

////////////////////////////
/// UPDATE USER PASSWORD ///
////////////////////////////
// #region PATCH /password
/**
 * Updates the current authenticated user's password.
 *
 * @route PATCH /api/auth/password
 * @middleware authenticate
 * @param {string} currentPassword - The user's current password.
 * @param {string} newPassword - The new password to set.
 * @returns {Object} A message indicating the result of the operation.
 */
router.patch('/password', authenticate, async (req: Request, res: Response) => {
	const user = req.user
	if (!user) return res.status(401).json({ passed: false, message: 'Unauthorized', field: 'user' })

	const { currentPassword, newPassword, confirmation } = req.body

	if (!currentPassword)
		return res.status(400).json({
			passed: false,
			message: 'Current password is required',
			field: 'currentPassword'
		})
	if (!newPassword)
		return res.status(400).json({
			passed: false,
			message: 'New password is required',
			field: 'newPassword'
		})
	if (!confirmation)
		return res.status(400).json({
			passed: false,
			message: 'Password confirmation is required',
			field: 'confirmation'
		})

	if (newPassword !== confirmation)
		return res.status(400).json({
			passed: false,
			message: 'New password and confirmation do not match',
			field: 'confirmation'
		})

	const { passed, message, value } = await validatePassword(newPassword)

	if (!passed) return res.status(400).json({ passed: false, message, field: 'newPassword' })

	try {
		const storedHash = await pool.query('SELECT password FROM user WHERE id = ?', [user.id]).then((res) => (res[0] as any[])[0].password)

		const isMatch = await bcrypt.compare(currentPassword, storedHash)

		if (!isMatch)
			return res.status(400).json({
				passed: false,
				message: 'Current password is incorrect',
				field: 'currentPassword'
			})

		const newHash = await bcrypt.hash(value!, 10)

		await pool.execute('UPDATE user SET password = ? WHERE id = ?', [newHash, user.id])

		return res.json({
			passed: true,
			message: 'Password changed successfully'
		})
	} catch (err) {
		console.error(err)
		return res.status(500).json({ passed: false, message: 'Internal server error' })
	}
})

export default router
