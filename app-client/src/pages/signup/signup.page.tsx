import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios, { AxiosError } from 'axios'

import { useAuth } from '../../store/auth.ts'
import type { ValidationError } from '../../utils/types'

import './signup.styles.scss'

interface ServerErrorResponse {
	message?: string
	errors?: ValidationError[]
}
const SignupPage = () => {
	const [formErrors, setFormErrors] = useState<ValidationError[]>([])
	const [generalError, setGeneralError] = useState<string | null>(null)

	const setAuth = useAuth(state => state.setAuth)
	const navigate = useNavigate()
	const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

	const getFieldError = (field: string) => formErrors.find(err => err.field === field)?.message

	return (
		<div id='signup-page'>
			<form
				id='signup-form'
				noValidate
				onSubmit={async e => {
					e.preventDefault()
					setFormErrors([])
					setGeneralError(null)

					const formData = new FormData(e.currentTarget)
					const data = Object.fromEntries(formData.entries())
					data.role = 'parent' // Default role for signup

					try {
						const response = await axios.post('/api/auth/register', data)
						const { user, accessToken } = response.data

						setAuth(user, accessToken, false)

						navigate(`/${user.role}`)
					} catch (error) {
						console.error('Error:', error)

						if (!inputRefs.current) return

						const axiosError = error as AxiosError<ServerErrorResponse>
						const responseData = axiosError.response?.data

						if (responseData?.errors) {
							const serverErrors = responseData.errors
							setFormErrors(serverErrors)

							const firstErrorField = serverErrors.find(err => inputRefs.current[err.field])
							if (firstErrorField) {
								inputRefs.current[firstErrorField.field]?.focus()
							}
						} else if (responseData?.message) {
							setGeneralError(responseData.message)
						} else {
							setGeneralError('An unexpected server error occurred.')
						}
					}
				}}
			>
				<h1>Sign Up</h1>

				<div id='username-group' className='form-group'>
					<label htmlFor='username'>Username</label>
					<input
						type='text'
						id='username'
						name='username'
						required
						ref={el => {
							inputRefs.current['username'] = el
						}}
					/>
					{getFieldError('username') && (
						<span className='field-error' style={{ color: 'red' }}>
							{getFieldError('username')}
						</span>
					)}
				</div>

				<div id='password-group' className='form-group'>
					<label htmlFor='password'>Password</label>
					<input
						type='password'
						id='password'
						name='password'
						required
						ref={el => {
							inputRefs.current['password'] = el
						}}
					/>
					{getFieldError('password') && (
						<span className='field-error' style={{ color: 'red' }}>
							{getFieldError('password')}
						</span>
					)}
				</div>

				<div id='first-name-group' className='form-group'>
					<label htmlFor='first-name'>First Name</label>
					<input
						type='text'
						id='first-name'
						name='firstName'
						required
						ref={el => {
							inputRefs.current['firstName'] = el
						}}
					/>
					{getFieldError('firstName') && (
						<span className='field-error' style={{ color: 'red' }}>
							{getFieldError('firstName')}
						</span>
					)}
				</div>

				<div id='last-name-group' className='form-group'>
					<label htmlFor='last-name'>Last Name</label>
					<input
						type='text'
						id='last-name'
						name='lastName'
						required
						ref={el => {
							inputRefs.current['lastName'] = el
						}}
					/>
					{getFieldError('lastName') && (
						<span className='field-error' style={{ color: 'red' }}>
							{getFieldError('lastName')}
						</span>
					)}
				</div>

				<button type='submit'>Sign Up</button>
				<div id='login-link'>
					Already have an account? <a href='/login'>Login</a>
				</div>
			</form>
		</div>
	)
}

export default SignupPage
