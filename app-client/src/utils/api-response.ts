/** The response format for API calls.
 *
 * This interface defines the structure of the response object that will be
 * returned by the API endpoints.
 */
export interface ApiResponse {
	/** The source of the response (e.g., the name of the API endpoint). */
	sender: string
	/** The unique status code within the API for this response.
	 * - 100 - 199: Informational responses
	 * - 200 - 299: Successful responses
	 * - 300 - 399: Redirection messages
	 * - 400 - 499: Client error responses
	 * - 500 - 599: Server error responses
	 *
	 * Note: These do not correspond to HTTP status codes, but are unique to the
	 * API's response structure.
	 */
	code: number
	/** Indicates whether the operation was successful or not. */
	passed: boolean
	/** A descriptive message providing more details about the response. */
	message?: string
	/** Data that can be included in the response.
	 *
	 * This can be any type of data that the API wants to return, such as an
	 * object, array, or primitive value.
	 */
	data?: any
}

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
