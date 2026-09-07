import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

import { type ApiResponse, type ValidationResult } from '../../utils/api-response.ts'
import type { User } from '../../utils/types.ts'

import { useAuth } from '../../store/auth.ts'

import './signup.styles.scss'

const SignupPage = () => {
	const [formResponse, setFormResponse] = useState<ApiResponse | null>(null)

	const setAuth = useAuth((state) => state.setAuth)
	const navigate = useNavigate()
	const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

	const getInputMessage = (field: string) => {
		if (!formResponse || !formResponse.data?.validations) return null

		const validations = formResponse?.data?.validations as ValidationResult[]
		if (!validations) return null

		const validation = validations.find((v) => v.field === field)
		return !validation ? null : (
			<span className={['input-message', validation.passed ? 'passed' : 'failed'].join(' ')}>{validation.message}</span>
		)
	}

	const getGeneralMessage = () => {
		if (!formResponse || formResponse.data?.validations) return null

		return (
			<div id='general-error-message' className={['general-message', formResponse.passed ? 'passed' : 'failed'].join(' ')}>
				{formResponse.message}
			</div>
		)
	}

	return (
		<div id='signup-page'>
			<form
				id='signup-form'
				noValidate
				onSubmit={async (e) => {
					e.preventDefault()
					setFormResponse(null)

					const formData = new FormData(e.currentTarget)
					const data = Object.fromEntries(formData.entries())
					data.role = 'owner' // Default role for signup

					try {
						const response = await axios.post('/api/auth/register', data).then((res) => res.data as ApiResponse)

						setFormResponse(response)

						if (!response.passed) return

						const user = response.data.user as User
						const accessToken = response.data.accessToken as string

						setAuth(user, accessToken)

						navigate(`/${user.isParent ? 'parent' : 'student'}`)
					} catch (error) {
						console.error('Error:', error)
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
						autoComplete='username'
						required
						ref={(el) => {
							inputRefs.current['username'] = el
						}}
					/>
					{getInputMessage('username')}
				</div>

				<div id='password-group' className='form-group'>
					<label htmlFor='password'>Password</label>
					<input
						type='password'
						id='password'
						name='password'
						autoComplete='new-password'
						required
						ref={(el) => {
							inputRefs.current['password'] = el
						}}
					/>
					{getInputMessage('password')}
				</div>

				<div id='confirmation-group' className='form-group'>
					<label htmlFor='confirmation'>Confirm Password</label>
					<input
						type='password'
						id='confirmation'
						name='confirmation'
						autoComplete='new-password'
						required
						ref={(el) => {
							inputRefs.current['confirmation'] = el
						}}
					/>
					{getInputMessage('confirmation')}
				</div>

				<div id='first-name-group' className='form-group'>
					<label htmlFor='first-name'>First Name</label>
					<input
						type='text'
						id='first-name'
						name='firstName'
						autoComplete='given-name'
						required
						ref={(el) => {
							inputRefs.current['firstName'] = el
						}}
					/>
					{getInputMessage('firstName')}
				</div>

				<div id='last-name-group' className='form-group'>
					<label htmlFor='last-name'>Last Name</label>
					<input
						type='text'
						id='last-name'
						name='lastName'
						autoComplete='family-name'
						required
						ref={(el) => {
							inputRefs.current['lastName'] = el
						}}
					/>
					{getInputMessage('lastName')}
				</div>

				<button type='submit'>Sign Up</button>
				<div id='login-link'>
					Already have an account? <a href='/login'>Login</a>
				</div>

				{getGeneralMessage()}
			</form>
		</div>
	)
}

export default SignupPage
