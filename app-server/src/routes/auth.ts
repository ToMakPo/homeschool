import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

import pool from '../database/config'
import { User } from '../utils/types'
import { authenticate, signToken } from '../middleware/auth'
import { validateUsername, validatePassword, validateName } from '../utils/validation'

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
 * @param {string} firstName - The first name of the new user.
 * @param {string} lastName - The last name of the new user.
 * @param {'parent' | 'student'} role - The role of the new user, either 'parent' or 'student'.
 * @param {string} [familyId] - Optional family ID to associate the new user with an existing family.
 * @returns {Object} An object containing the newly created user and an access token.
 * @throws {400} If any of the input fields are invalid or missing.
 * @throws {500} If there is an internal server error during user creation.
 */
router.post('/register', async (req: Request, res: Response) => {
	const { username, password, firstName, lastName, role, familyId = null } = req.body

	/// VALIDATE INPUTS ///

	const errors = [] as { field: string; message: string }[]

	const usernameValidation = await validateUsername(username)
	if (!usernameValidation.valid) errors.push({ field: 'username', message: usernameValidation.message })

	const passwordValidation = await validatePassword(password)
	if (!passwordValidation.valid) errors.push({ field: 'password', message: passwordValidation.message })

	const firstNameValidation = await validateName(firstName, 'First name')
	if (!firstNameValidation.valid) errors.push({ field: 'firstName', message: firstNameValidation.message })

	const lastNameValidation = await validateName(lastName, 'Last name')
	if (!lastNameValidation.valid) errors.push({ field: 'lastName', message: lastNameValidation.message })

	const roleValidation = ['parent', 'student'].includes(role)
	if (!roleValidation) errors.push({ field: 'role', message: 'Role must be either "parent" or "student"' })

	if (familyId !== null) {
		const familyExists = await pool
			.query('SELECT COUNT(*) AS count FROM family WHERE id = ?', [familyId])
			.then(result => (result[0] as any[])[0].count > 0)
		if (!familyExists) errors.push({ field: 'familyId', message: 'Provided familyId does not exist.' })
	}

	if (errors.length > 0) return res.status(400).json({ errors })

	/// CREATE NEW USER

	try {
		const userId = uuidv4()
		const hashedPassword = await bcrypt.hash(passwordValidation.value!, 10)

		await pool.query('INSERT INTO users (id, username, hashedPassword, firstName, lastName, role) VALUES (?, ?, ?, ?, ?, ?)', [
			userId,
			usernameValidation.value!,
			hashedPassword,
			firstNameValidation.value!,
			lastNameValidation.value!,
			role
		])

		const newUser = (await pool.query('SELECT * FROM users WHERE id = ?', [userId]).then(result => result[0] as User[]))[0]
		if (!newUser) return res.status(500).json({ message: 'Unable to retrieve newly created user.' })

		if (familyId) {
			await pool.query('INSERT INTO family_member (familyId, userId) VALUES (?, ?)', [familyId, userId])

			// TODO: Broadcast to all family members that a new member has joined the family.
		}

		const { accessToken, expiresAt } = signToken(newUser)

		await pool.query('INSERT INTO sessions (id, userId, authToken, expiresAt) VALUES (?, ?, ?, ?)', [
			uuidv4(),
			newUser.id,
			accessToken,
			expiresAt
		])

		return res.status(201).json({ user: newUser, accessToken })
	} catch (error) {
		console.error(error)
		return res.status(500).json({ message: 'An error occurred while creating the user.', code: 'USER_CREATION_ERROR' })
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
 * @returns {Object} An object containing the authenticated user and access token.
 * @throws {400} If the username or password is missing.
 * @throws {401} If the username or password is incorrect.
 * @throws {500} If there is an internal server error during login.
 */
router.post('/login', async (req: Request, res: Response) => {
	const username = req.body.username.trim()
	const password = req.body.password

	/// VALIDATE INPUTS

	const errors = [] as { field: string; message: string }[]
	if (!username) errors.push({ field: 'username', message: 'Username is required' })
	if (!password) errors.push({ field: 'password', message: 'Password is required' })

	if (errors.length > 0) return res.status(400).json({ errors })

	try {
		const loginFailedResponse = { message: 'Invalid username or password' }

		const [id, hashedPassword] = (
			await pool
				.query('SELECT id, hashedPassword FROM users WHERE username = ?', [username])
				.then(result => result[0] as [string, string][])
		)[0]
		if (!hashedPassword) return res.status(401).json(loginFailedResponse)

		const passwordMatch = await bcrypt.compare(password, hashedPassword)
		if (!passwordMatch) return res.status(401).json(loginFailedResponse)

		const user = (await pool.query('SELECT * FROM view_user WHERE id = ?', [id]).then(result => result[0] as User[]))[0]
		if (!user) return res.status(500).json({ message: 'Unable to retrieve user after successful login.' })

		/// LOG THE USER INTO THE SESSION

		const { accessToken, expiresAt } = signToken(user)

		await pool.query('INSERT INTO sessions (id, userId, authToken, expiresAt) VALUES (?, ?, ?, ?)', [
			uuidv4(),
			user.id,
			accessToken,
			expiresAt
		])

		// TODO: Broadcast to all family members that the user has logged in.

		return res.status(200).json({ user, accessToken })
	} catch (error) {
		console.error(error)
		return res.status(500).json({ message: 'An error occurred while logging in.', code: 'LOGIN_ERROR' })
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
 * @throws {401} If the user is not authenticated or if the token is missing/invalid.
 * @throws {500} If there is an internal server error during logout.
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
	const user = req.user
	if (!user) return res.status(401).json({ message: 'User not authenticated' })

	const authHeader = req.headers.authorization
	if (!authHeader?.startsWith('Bearer ')) {
		return res.status(401).json({ message: 'No token provided' })
	}

	try {
		const token = authHeader.slice(7)
		await pool.query('DELETE FROM sessions WHERE authToken = ?', [token])

		// TODO: Check if the user is still logged in on any other sessions.
		// If not, broadcast to all family members that the user has logged out.

		return res.status(200).json({ message: 'Logged out successfully' })
	} catch (error) {
		console.error(error)
		return res.status(500).json({ message: 'An error occurred while logging out.', code: 'LOGOUT_ERROR' })
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
 * @throws {401} If the user is not authenticated.
 * @throws {500} If there is an internal server error during logout.
 */
router.post('/logout-all', authenticate, async (req: Request, res: Response) => {
	const user = req.user
	if (!user) return res.status(401).json({ message: 'User not authenticated' })

	const ignoreToken = (req.body.ignoreToken as string) || ''

	try {
		await pool.query('DELETE FROM sessions WHERE userId = ? AND authToken != ?', [user.id, ignoreToken])

		// TODO: If not ignoring the current session, broadcast to all family members that the user has logged out of all sessions.

		return res.status(200).json({ message: 'Logged out of all sessions successfully' })
	} catch (error) {
		console.error(error)
		return res.status(500).json({ message: 'An error occurred while logging out of all sessions.', code: 'LOGOUT_ALL_ERROR' })
	}
})

export default router
