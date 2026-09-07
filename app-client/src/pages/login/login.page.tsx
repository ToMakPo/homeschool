import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

import { type ApiResponse, type ValidationResult } from '../../utils/api-response.ts'
import type { User } from '../../utils/types.ts'

import { useAuth } from '../../store/auth.ts'

import './login.styles.scss'

const LoginPage = () => {
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
		<div id='login-page'>
			<form
				id='login-form'
				noValidate
				onSubmit={async (e) => {
					e.preventDefault()
					setFormResponse(null)

					const formData = new FormData(e.currentTarget)
					const data = Object.fromEntries(formData.entries())
					data.rememberMe = 'on' // Convert checkbox value to boolean

					try {
						const response = await axios.post('/api/auth/login', data).then((res) => res.data as ApiResponse)

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
				<h1>Login</h1>

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
						autoComplete='current-password'
						required
						ref={(el) => {
							inputRefs.current['password'] = el
						}}
					/>
					{getInputMessage('password')}
				</div>

				<div id='remember-me-group' className='form-group'>
					<label htmlFor='remember-me'>
						<input type='checkbox' id='remember-me' name='rememberMe' />
						Remember Me
					</label>
				</div>

				<button type='submit'>Login</button>

				<div id='signup-link'>
					Don't have an account? <a href='/signup'>Sign Up</a>
				</div>

				{getGeneralMessage()}
			</form>
		</div>
	)
}

export default LoginPage
