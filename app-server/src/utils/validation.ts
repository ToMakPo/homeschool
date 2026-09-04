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

export interface ValidationResult<T = string> {
	/** Indicates whether the validation was successful. */
	passed: boolean
	/** Provides a message describing the result of the validation. */
	message: string
	/** The cleaned value, if applicable. */
	value?: T
	/** The field name associated with the validation error. */
	field?: string
}

const validationResult = <T = string>(passed: boolean, message: string, value?: T, field?: string): ValidationResult<T> => {
	return { passed, message, value, field }
}

function toKey(text: string): string {
	// Convert the field name to a standardized camelCase key format.
	return text
		.toLowerCase()
		.replace(/[\(\[\{\<].*?[\)\]\}\>]/g, '') // Remove parentheses/brackets/curly braces/angle brackets and their contents
		.replace(/[_-]/g, ' ') // Underscores/hyphens -> spaces
		.replace(/[^a-z0-9 ]/g, '') // Remove non-alphanumeric characters
		.trim()
		.replace(/\s+/g, ' ') // Collapse multiple spaces
		.replace(/\s([a-z])/g, (_, char) => char.toUpperCase()) // Capitalize letters after spaces
		.replace(/\s/g, '') // Remove spaces
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
export async function validateUsername(username: any, ignoreId?: string): Promise<ValidationResult<string>> {
	if (username === undefined || username === null) {
		return validationResult<string>(false, 'Username is required', undefined, 'username')
	}

	if (typeof username !== 'string') {
		return validationResult<string>(false, 'Username must be a string', undefined, 'username')
	}

	const value = username.trim()

	if (value.length < USERNAME_MIN_LENGTH) {
		return validationResult<string>(false, `Username must be at least ${USERNAME_MIN_LENGTH} characters long`, undefined, 'username')
	}

	if (value.length > USERNAME_MAX_LENGTH) {
		return validationResult<string>(false, `Username must be at most ${USERNAME_MAX_LENGTH} characters long`, undefined, 'username')
	}

	if (!USERNAME_REGEX.test(value)) {
		return validationResult<string>(false, 'Username can only contain letters, numbers, and underscores', undefined, 'username')
	}

	const isUnique = await pool
		.query('SELECT COUNT(*) AS count FROM user WHERE username = ? AND id != ?', [value, ignoreId ?? ''])
		.then((res) => (res[0] as any[])[0].count === 0)

	if (!isUnique) {
		return validationResult<string>(false, 'Username is already taken', undefined, 'username')
	}

	return validationResult<string>(true, 'Username is valid', value, 'username')
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
export async function validatePassword(password: any, confirmation?: any, fieldName = 'password'): Promise<ValidationResult<string>> {
	const field = toKey(fieldName)

	if (password === undefined || password === null) {
		return validationResult<string>(false, 'Password is required', undefined, field)
	}

	if (typeof password !== 'string') {
		return validationResult<string>(false, 'Password must be a string', undefined, field)
	}

	const value = password.trim()

	if (value.length < PASSWORD_MIN_LENGTH) {
		return validationResult<string>(false, `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`, undefined, field)
	}

	if (value.length > PASSWORD_MAX_LENGTH) {
		return validationResult<string>(false, `Password must be at most ${PASSWORD_MAX_LENGTH} characters long`, undefined, field)
	}

	if (!PASSWORD_UPPERCASE_REGEX.test(value)) {
		return validationResult<string>(false, 'Password must contain at least one uppercase letter', undefined, field)
	}

	if (!PASSWORD_LOWERCASE_REGEX.test(value)) {
		return validationResult<string>(false, 'Password must contain at least one lowercase letter', undefined, field)
	}

	if (!PASSWORD_NUMBER_REGEX.test(value)) {
		return validationResult<string>(false, 'Password must contain at least one number', undefined, field)
	}

	if (!PASSWORD_SPECIAL_CHAR_REGEX.test(value)) {
		return validationResult<string>(false, 'Password must contain at least one special character', undefined, field)
	}

	if (PASSWORD_INVALID_CHAR_REGEX.test(value)) {
		return validationResult<string>(false, 'Password contains invalid characters', undefined, field)
	}

	if (confirmation !== undefined && value !== confirmation) {
		return validationResult<string>(false, 'Password and confirmation do not match', undefined, 'confirmation')
	}

	return validationResult<string>(true, 'Password is valid', value, field)
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
export async function validateName(name: any, fieldName: string, nullable = false): Promise<ValidationResult<string | null>> {
	const field = toKey(fieldName)

	if (nullable && name === null) {
		return validationResult<string | null>(true, `${fieldName} is set to null`, null, field)
	}

	if (name === undefined || name === null) {
		return validationResult<string>(false, `${fieldName} is required`, undefined, field)
	}

	if (typeof name !== 'string') {
		return validationResult<string>(false, `${fieldName} must be a string`, undefined, field)
	}

	const value = name.trim().replace(/\s+/g, ' ').replace(/-+/g, '-').replace(/'+/g, "'")

	if (nullable && value === '') {
		return validationResult<string | null>(true, `${fieldName} is set to null`, null, field)
	}

	if (value.length < NAME_MIN_LENGTH) {
		return validationResult<string>(false, `${fieldName} must be at least ${NAME_MIN_LENGTH} characters long`, undefined, field)
	}

	if (value.length > NAME_MAX_LENGTH) {
		return validationResult<string>(false, `${fieldName} must be at most ${NAME_MAX_LENGTH} characters long`, undefined, field)
	}

	if (!NAME_REGEX.test(value)) {
		return validationResult<string>(false, `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`, undefined, field)
	}

	return validationResult<string>(true, `${fieldName} is valid`, value, field)
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
): Promise<ValidationResult<string | null>> {
	const field = toKey(fieldName)

	if (nullable && str === null) {
		return validationResult<string | null>(true, `${fieldName} is optional and not provided`, null, field)
	}

	if (str === undefined || str === null) {
		return validationResult<string>(false, `${fieldName} is required`, undefined, field)
	}

	if (typeof str !== 'string') {
		return validationResult<string>(false, `${fieldName} must be a string`, undefined, field)
	}

	const value = trim ? str.trim() : str

	if (nullable && value === '' && minLength > 0) {
		return validationResult<string | null>(true, `${fieldName} is optional and empty`, null, field)
	}

	if (value.length < minLength) {
		return validationResult<string>(false, `${fieldName} must be at least ${minLength} characters long`, undefined, field)
	}

	if (value.length > maxLength) {
		return validationResult<string>(false, `${fieldName} must be at most ${maxLength} characters long`, undefined, field)
	}

	return validationResult<string>(true, `${fieldName} is valid`, value, field)
}

/** Validates an enum value.
 *
 * Validation rules:
 * - The value must be one of the allowed values.
 *
 * @param value - The value to validate.
 * @param allowedValues - An array of allowed values for the enum.
 * @param fieldName - The name of the field being validated (for error messages).
 * @returns A promise that resolves to a `ValidationResult` object containing the
 * validation result, message, and cleaned value.
 */
export async function validateEnum<T>(value: any, allowedValues: T[], fieldName: string): Promise<ValidationResult<T>> {
	const field = toKey(fieldName)

	if (!allowedValues.includes(value)) {
		return validationResult<T>(
			false,
			`${fieldName} must be one of the following values: ${allowedValues
				.map((v) => {
					return typeof v === 'string' ? `'${v}'` : v
				})
				.join(', ')}`,
			undefined,
			field
		)
	}

	return validationResult<T>(true, `${fieldName} is valid`, value, field)
}

/** Validates a boolean value.
 *
 * Validation rules:
 * - The value must be a boolean
 * - OR the value can be a string representation of a boolean (e.g., "true", "false", "1", "0").
 * - OR the value can be a number representation of a boolean (e.g., 1, 0).
 * - If nullable is true, the value can also be null.
 *
 * @param value - The value to validate.
 * @param fieldName - The name of the field being validated (for error messages).
 * @param nullable - Whether the field is optional (default: false).
 * @returns A promise that resolves to a `ValidationResult` object containing the
 * validation result, message, and cleaned value.
 */
export async function validateBoolean(value: any, fieldName: string, nullable = false): Promise<ValidationResult<boolean | null>> {
	const field = toKey(fieldName)

	// If the field is nullable and the value is null, the validation passes.
	if (nullable && value === null) {
		return validationResult<boolean | null>(true, `${fieldName} is optional and is null`, null, field)
	}

	// If the value is undefined or null, the validation fails.
	if (value === undefined || value === null) {
		return validationResult<boolean>(false, `${fieldName} is required`, undefined, field)
	}

	// If the value is already a boolean, the validation passes.
	if (typeof value === 'boolean') {
		return validationResult<boolean>(true, `${fieldName} is valid`, value, field)
	}

	// If the value is a string, check for common true/false representations.
	if (typeof value === 'string') {
		const trueValues: string[] = ['true', '1', 'yes', 'y', 'on']
		const falseValues: string[] = ['false', '0', 'no', 'n', 'off']

		if (trueValues.includes(value.toLocaleLowerCase())) {
			return validationResult<boolean>(true, `${fieldName} is valid`, true, field)
		}

		if (falseValues.includes(value.toLocaleLowerCase())) {
			return validationResult<boolean>(true, `${fieldName} is valid`, false, field)
		}

		return validationResult<boolean>(false, `${fieldName} passed in an unknown string value`, undefined, field)
	}

	// If the value is a number, then convert it to a boolean (0 = false, any other number = true).
	if (typeof value === 'number') {
		return validationResult<boolean>(true, `${fieldName} is valid`, Boolean(value), field)
	}

	// Otherwise, the validation fails because the value is not a boolean, string, or number.
	return validationResult<boolean | null>(false, `${fieldName} must be a boolean`, undefined, field)
}
