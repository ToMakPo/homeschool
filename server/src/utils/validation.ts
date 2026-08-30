import pool from '../database/config'

const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 20
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/

const PASSWORD_MIN_LENGTH = 6
const PASSWORD_MAX_LENGTH = 100
const PASSWORD_UPPERCASE_REGEX = /[A-Z]/
const PASSWORD_LOWERCASE_REGEX = /[a-z]/
const PASSWORD_NUMBER_REGEX = /[0-9]/
const PASSWORD_SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>]/
const PASSWORD_INVALID_CHAR_REGEX = /[^A-Za-z0-9!@#$%^&*(),.?":{}|<>]/

const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 50
const NAME_REGEX = /^[a-zA-Z]([a-zA-Z\s'-]*[a-zA-Z])?$/

interface ValidationResult<T = string> {
	/** Indicates whether the validation was successful. */
	valid: boolean
	/** Provides a message describing the result of the validation. */
	message: string
	/** The cleaned value, if applicable.
	 *
	 * If the validation failed, this will be `undefined`.
	 * If the validation succeeded, this will be the cleaned value.
	 */
	value: T | undefined
}

/** Validates a username.
 *
 * Validation rules:
 * - Must be a string.
 * - Must be at least 3 characters long.
 * - Must be at most 20 characters long.
 * - Can only contain letters, numbers, and underscores.
 * - Must be unique in the database, unless it matches the `ignore` parameter.
 *
 * @param username - The username to validate.
 * @param ignore - An optional username to ignore when checking for uniqueness.
 * @returns A promise that resolves to a `ValidationResult` object containing the
 * validation result, message, and cleaned value.
 */
export async function validateUsername(username: any, ignore?: string): Promise<ValidationResult<string>> {
	if (username === undefined || username === null) {
		return { valid: false, message: 'Username is required', value: undefined }
	}

	if (typeof username !== 'string') {
		return { valid: false, message: 'Username must be a string', value: undefined }
	}

	const value = username.trim()

	if (value.length < USERNAME_MIN_LENGTH) {
		return { valid: false, message: `Username must be at least ${USERNAME_MIN_LENGTH} characters long`, value: undefined }
	}

	if (value.length > USERNAME_MAX_LENGTH) {
		return { valid: false, message: `Username must be at most ${USERNAME_MAX_LENGTH} characters long`, value: undefined }
	}

	if (!USERNAME_REGEX.test(value)) {
		return { valid: false, message: 'Username can only contain letters, numbers, and underscores', value: undefined }
	}

	const isUnique =
		(ignore && value === ignore)
		|| !(await pool.query('SELECT COUNT(*) AS count FROM users WHERE username = ?', [value]).then(res => (res[0] as any[])[0].count === 0))

	if (!isUnique) {
		return { valid: false, message: 'Username is already taken', value: undefined }
	}

	return { valid: true, value, message: 'Username is valid' }
}

/** Validates a password.
 *
 * Validation rules:
 * - Must be a string.
 * - Must be at least 6 characters long.
 * - Must be at most 100 characters long.
 * - Must contain at least one uppercase letter.
 * - Must contain at least one lowercase letter.
 * - Must contain at least one number.
 * - Must contain at least one special character. (!@#$%^&*(),.?":{}|<>)
 * - Must not contain any invalid characters.
 *
 * @param password - The password to validate.
 * @returns A promise that resolves to a `ValidationResult` object containing the
 * validation result, message, and cleaned value.
 */
export async function validatePassword(password: any): Promise<ValidationResult<string>> {
	if (password === undefined || password === null) {
		return { valid: false, message: 'Password is required', value: undefined }
	}

	if (typeof password !== 'string') {
		return { valid: false, message: 'Password must be a string', value: undefined }
	}

	const value = password.trim()

	if (value.length < PASSWORD_MIN_LENGTH) {
		return { valid: false, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`, value: undefined }
	}

	if (value.length > PASSWORD_MAX_LENGTH) {
		return { valid: false, message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters long`, value: undefined }
	}

	if (!PASSWORD_UPPERCASE_REGEX.test(value)) {
		return { valid: false, message: 'Password must contain at least one uppercase letter', value: undefined }
	}

	if (!PASSWORD_LOWERCASE_REGEX.test(value)) {
		return { valid: false, message: 'Password must contain at least one lowercase letter', value: undefined }
	}

	if (!PASSWORD_NUMBER_REGEX.test(value)) {
		return { valid: false, message: 'Password must contain at least one number', value: undefined }
	}

	if (!PASSWORD_SPECIAL_CHAR_REGEX.test(value)) {
		return { valid: false, message: 'Password must contain at least one special character', value: undefined }
	}

	if (PASSWORD_INVALID_CHAR_REGEX.test(value)) {
		return { valid: false, message: 'Password contains invalid characters', value: undefined }
	}

	return { valid: true, message: 'Password is valid', value }
}

/** Validates a name.
 *
 * Validation rules:
 * - Must be a string.
 * - Must be at least 2 characters long.
 * - Must be at most 50 characters long.
 * - Can only contain letters, spaces, hyphens, and apostrophes.
 * - Leading and trailing whitespace will be trimmed.
 *
 * @param name - The name to validate.
 * @param fieldName - The name of the field being validated (for error messages).
 * @param nullable - Whether the field is optional (default: false).
 * @returns A promise that resolves to a `ValidationResult` object containing the
 * validation result, message, and cleaned value.
 */
export async function validateName(name: any, fieldName: string, nullable = false): Promise<ValidationResult> {
	if (nullable && (name === undefined || name === null)) {
		return { valid: true, message: `${fieldName} is optional and not provided`, value: '' }
	}

	if (name === undefined || name === null) {
		return { valid: false, message: `${fieldName} is required`, value: undefined }
	}

	if (typeof name !== 'string') {
		return { valid: false, message: `${fieldName} must be a string`, value: undefined }
	}

	const value = name.trim().replace(/\s+/g, ' ').replace(/-+/g, '-').replace(/'+/g, "'")

	if (nullable && value === '') {
		return { valid: true, message: `${fieldName} is optional and empty`, value: '' }
	}

	if (value.length < NAME_MIN_LENGTH) {
		return { valid: false, message: `${fieldName} must be at least ${NAME_MIN_LENGTH} characters long`, value: undefined }
	}

	if (value.length > NAME_MAX_LENGTH) {
		return { valid: false, message: `${fieldName} must be at most ${NAME_MAX_LENGTH} characters long`, value: undefined }
	}

	if (!NAME_REGEX.test(value)) {
		return { valid: false, message: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`, value: undefined }
	}

	return { valid: true, message: `${fieldName} is valid`, value }
}

/** Validates a string.
 *
 * Validation rules:
 * - Must be a string or null/undefined if nullable is true.
 * - Can be trimmed of leading and trailing whitespace.
 * - Must be at least `minLength` characters long.
 * - Must be at most `maxLength` characters long.
 * - Can be nullable (optional).
 *
 * @param str - The string to validate.
 * @param fieldName - The name of the field being validated (for error messages).
 * @param trim - Whether to trim leading and trailing whitespace (default: true).
 * @param minLength - The minimum length of the string (default: 0).
 * @param maxLength - The maximum length of the string (default: Infinity).
 * @param nullable - Whether the field is optional (default: false).
 * @returns A promise that resolves to a `ValidationResult` object containing the
 * validation result, message, and cleaned value.
 */
export async function validateString(
	str: any,
	fieldName: string,
	trim = true,
	minLength = 0,
	maxLength = Infinity,
	nullable = false
): Promise<ValidationResult<string>> {
	if (nullable && (str === undefined || str === null)) {
		return { valid: true, message: `${fieldName} is optional and not provided`, value: '' }
	}

	if (str === undefined || str === null) {
		return { valid: false, message: `${fieldName} is required`, value: undefined }
	}

	if (typeof str !== 'string') {
		return { valid: false, message: `${fieldName} must be a string`, value: undefined }
	}

	const value = trim ? str.trim() : str

	if (nullable && value === '') {
		return { valid: true, message: `${fieldName} is optional and empty`, value: '' }
	}

	if (value.length < minLength) {
		return { valid: false, message: `${fieldName} must be at least ${minLength} characters long`, value: undefined }
	}

	if (value.length > maxLength) {
		return { valid: false, message: `${fieldName} must be at most ${maxLength} characters long`, value: undefined }
	}

	return { valid: true, message: `${fieldName} is valid`, value }
}
