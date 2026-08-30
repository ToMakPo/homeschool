import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

import { User } from '../utils/types'

declare global {
	namespace Express {
		interface Request {
			user?: User
		}
	}
}

const longTokenExpiration = process.env.JWT_LONG_EXPIRES_IN || '30d'
const shortTokenExpiration = process.env.JWT_EXPIRES_IN || '1h'

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
export function authenticate(req: Request, res: Response, next: NextFunction): void {
	const authHeader = req.headers.authorization
	if (!authHeader?.startsWith('Bearer ')) {
		res.status(401).json({ message: 'No token provided' })
		return
	}

	const token = authHeader.slice(7)
	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET!) as User
		req.user = payload

		next()
	} catch {
		res.status(401).json({ message: 'Invalid or expired token' })
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
	const accessToken = jwt.sign(user, process.env.JWT_SECRET!, { expiresIn } as jwt.SignOptions)

	const decoded = jwt.decode(accessToken) as { exp: number }
	const expiresAt = new Date(decoded.exp * 1000)
	const offset = expiresAt.getTimezoneOffset() * 60000
	const localExpiresAt = new Date(expiresAt.getTime() - offset)
	// TODO: This needs to be tested to ensure that the expiration time is in production.

	return { accessToken, expiresAt: localExpiresAt }
}
