import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

import { User } from '../utils/types'
import pool from '../database/config'

declare global {
	namespace Express {
		interface Request {
			user?: User
		}
	}
}

const longTokenExpiration = process.env.JWT_LONG_EXPIRES_IN || '30d'
const shortTokenExpiration = process.env.JWT_EXPIRES_IN || '1h'

interface Session {
	id: string
	userId: string
	authToken: string
	expiresAt: Date
}

/** This middleware authenticates the user by verifying the JWT token provided in the Authorization header.
 *
 * If the token is valid, it attaches the user payload to the request object and calls the next middleware.
 *
 * If the token is invalid or missing, it responds with a 401 Unauthorized status.
 *
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The next middleware function.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
	const authHeader = req.headers.authorization
	if (!authHeader?.startsWith('Bearer ')) {
		res.status(401).json({ message: 'No token provided' })
		return
	}

	const token = authHeader.slice(7)
	try {
		if (await isTokenExpired(token)) throw new Error('Token expired')

		const payload = jwt.verify(token, process.env.JWT_SECRET!) as User
		req.user = payload

		next()
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Invalid or expired token'
		res.status(401).json({ message })
	}
}

/** Signs a JWT token for the given user.
 *
 * The token's expiration time is determined by the `rememberMe` parameter.
 *
 * @param user - The user object to include in the token payload.
 * @param rememberMe - If true, the token will have a longer expiration time;
 * otherwise, it will have a shorter expiration time.
 * @returns An object containing the signed JWT token and its expiration date.
 */
export function signToken(user: User, rememberMe = false) {
	const expiresIn = rememberMe ? longTokenExpiration : shortTokenExpiration
	const authToken = jwt.sign(user, process.env.JWT_SECRET!, { expiresIn } as jwt.SignOptions)

	const decoded = jwt.decode(authToken) as { exp: number }
	const expiresAt = new Date(decoded.exp * 1000)
	const offset = expiresAt.getTimezoneOffset() * 60000
	const localExpiresAt = new Date(expiresAt.getTime() - offset)
	// TODO: This needs to be tested to ensure that the expiration time is in production.

	return { authToken, expiresAt: localExpiresAt }
}

/** Checks if a JWT token is expired.
 *
 * @param token - The JWT token to check.
 * @returns True if the token is expired or invalid, false otherwise.
 */
async function isTokenExpired(token: string): Promise<boolean> {
	try {
		const payload = JSON.parse(atob(token.split('.')[1]))

		const payloadTokenExpired = !payload.exp || payload.exp * 1000 <= Date.now()
		if (payloadTokenExpired) return true

		// If the token is not expired, check the database session.

		const session = (await pool.query('SELECT * FROM sessions WHERE authToken = ?', [token]).then((result) => result[0] as Session[]))[0]
		if (!session) return true

		const sessionExpired = !session.expiresAt || session.expiresAt.getTime() <= Date.now()
		if (sessionExpired) return true

		return false
	} catch {
		return true
	}
}
