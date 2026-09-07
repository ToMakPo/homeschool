import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

import { type ApiResponse, type ValidationResult } from '../../utils/api-response.ts'

import { useAuth } from '../../store/auth.ts'

import './password-reset.styles.scss'

const PasswordResetPage = () => {
	const [formResponse, setFormResponse] = useState<ApiResponse | null>(null)

	const setAuth = useAuth((state) => state.setAuth)
	const navigate = useNavigate()
	const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

	const getInputMessage = (field: string) => {
		const validations = formResponse?.data?.validations as ValidationResult[] | undefined
		if (!validations) return null

		const validation = validations.find((v) => v.field === field)
		return !validation ? null : (
			<span className={['input-message', validation.passed ? 'passed' : 'failed'].join(' ')}>{validation.message}</span>
		)
	}

	const getGeneralMessage = () => {
		if (!formResponse || !formResponse.data?.validations) return null

		const generalMessage = formResponse.data?.generalMessage
		return generalMessage ? (
			<div id='general-error-message' className={['general-message', generalMessage.passed ? 'passed' : 'failed'].join(' ')}>
				{generalMessage.message}
			</div>
		) : null
	}

	return (
		<div id='password-reset-page'>
			<form
				id='password-reset-form'
				noValidate
				onSubmit={async (e) => {
					e.preventDefault()
					setFormResponse(null)

					const formData = new FormData(e.currentTarget)
					const data = Object.fromEntries(formData.entries())

					try {
						const response = await axios.post('/api/auth/password-reset', data).then((res) => res.data as ApiResponse)

						setFormResponse(response)

						// const { user, accessToken } = response.data

						// setAuth(user, accessToken, false)

						// navigate(`/${user.role}`)
					} catch (error) {
						console.error('Error:', error)
					}
				}}
			>
				<h1>Password Reset</h1>

				<div id='old-password-group' className='form-group'>
					<label htmlFor='old-password'>Old Password</label>
					<input
						type='password'
						id='old-password'
						name='oldPassword'
						autoComplete='current-password'
						required
						ref={(el) => {
							inputRefs.current['oldPassword'] = el
						}}
					/>
					{getInputMessage('oldPassword')}
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

				<div id='remember-me-group' className='form-group'>
					<label htmlFor='remember-me'>
						<input type='checkbox' id='remember-me' name='rememberMe' />
						Remember Me
					</label>
				</div>

				<button type='submit'>Reset Password</button>

				{getGeneralMessage()}
			</form>
		</div>
	)
}

export default PasswordResetPage
