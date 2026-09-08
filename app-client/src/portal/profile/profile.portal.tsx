import { useEffect, useRef, useState } from 'react'

import Avatar from '../../components/avatar/avatar.component'

import type { ApiResponse, ValidationResult } from '../../utils/api-response'
import apiClient from '../../utils/api'
import type { User } from '../../utils/types'

import { useAuth } from '../../store/auth'

import './profile.styles.scss'

const ProfileUpdates = {
	username: { label: 'Username' },
	name: { label: 'First Name' },
	password: { label: 'Password' }
} as const
type ProfileUpdates = keyof typeof ProfileUpdates

const updateInputs = ['username', 'firstName', 'lastName', 'preferredName', 'currentPassword', 'newPassword', 'confirmation'] as const
type UpdateInput = (typeof updateInputs)[number]

const ProfilePortal = () => {
	const user = useAuth((state) => state.user)
	const setUser = useAuth((state) => state.setUser)

	const [updateInput, setUpdateInput] = useState<ProfileUpdates | null>(null)
	const [updateValues, setUpdateValues] = useState<Partial<Record<UpdateInput, string>>>({})

	const [formResponse, setFormResponse] = useState<ApiResponse | null>(null)

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

	useEffect(() => {
		if (!user) return

		switch (updateInput) {
			case 'username':
				setUpdateValues({ username: user.username })
				break
			case 'name':
				setUpdateValues({ firstName: user.firstName, lastName: user.lastName, preferredName: user.preferredName ?? '' })
				break
			case 'password':
				setUpdateValues({ currentPassword: '', newPassword: '', confirmation: '' })
				break
			default:
				setUpdateValues({})
		}
	}, [updateInput, user])

	const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

	async function updateAvatar() {
		// Open file picker to select a new avatar image
		const fileInput = document.createElement('input')
		fileInput.type = 'file'
		fileInput.accept = 'image/*'
		fileInput.onchange = async (event) => {
			const target = event.target as HTMLInputElement
			if (!target.files || target.files.length === 0) return
			const file = target.files[0]
			// Handle the selected file (e.g., upload it as the new avatar)

			const formData = new FormData()

			formData.append('avatar', file)

			try {
				const result = await apiClient.patch('/api/user/avatar', formData)

				if (user) setUser({ ...user, avatarUrl: result.data.avatarUrl })
			} catch (error) {
				console.error('Error updating avatar:', error)
			}
		}
		fileInput.click()
	}

	const avatarGroup = <Avatar user={user!} size={200} onClick={updateAvatar} />

	const usernameGroup = (
		<div id='username-info' className='info-container' onClick={() => setUpdateInput('username')}>
			<span className='label'>Username:</span>
			{updateInput !== 'username' ? (
				<>
					{!user ? (
						<span className='loading'>loading...</span>
					) : (
						<>
							<span className='user-value'>{user.username ?? ''}</span>
						</>
					)}
				</>
			) : (
				<>
					<div className='info-group'>
						<input
							type='text'
							id='username'
							name='username'
							autoComplete='username'
							placeholder='Username'
							value={updateValues.username ?? ''}
							onChange={(e) => setUpdateValues((prev) => ({ ...prev, username: e.target.value }))}
							ref={(el) => {
								inputRefs.current['username'] = el
							}}
						/>

						{getInputMessage('username')}
					</div>

					<div className='actions'>
						<button
							className='cancel-button'
							onClick={(e) => {
								e.stopPropagation()
								setFormResponse(null)
								setUpdateInput(null)
							}}
						>
							Cancel
						</button>

						<button
							className='save-button'
							onClick={async (e) => {
								e.stopPropagation()
								setFormResponse(null)

								const response = await apiClient.patch('/api/user', { updates: updateValues })

								setFormResponse(response)

								if (!response.passed) return

								const updatedUser = response.data as User

								setUser(updatedUser)
								setUpdateInput(null)
							}}
						>
							Save
						</button>
					</div>
				</>
			)}
		</div>
	)

	const nameGroup = (
		<div id='name-info' className='info-container' onClick={() => setUpdateInput('name')}>
			<span className='label'>Name:</span>
			{updateInput !== 'name' ? (
				<>
					{!user ? (
						<span className='loading'>loading...</span>
					) : (
						<>
							<span className='user-value'>{`${user.firstName ?? ''} ${user.lastName ?? ''}`}</span>
							<span className='user-value'>{user.preferredName ?? ''}</span>
						</>
					)}
				</>
			) : (
				<>
					<div className='info-group'>
						<input
							type='text'
							id='first-name'
							name='firstName'
							autoComplete='given-name'
							placeholder='First Name'
							value={updateValues.firstName ?? ''}
							onChange={(e) => setUpdateValues((prev) => ({ ...prev, firstName: e.target.value }))}
							ref={(el) => {
								inputRefs.current['firstName'] = el
							}}
						/>

						{getInputMessage('firstName')}
					</div>

					<div className='info-group'>
						<input
							type='text'
							id='last-name'
							name='lastName'
							autoComplete='family-name'
							placeholder='Last Name'
							value={updateValues.lastName ?? ''}
							onChange={(e) => setUpdateValues((prev) => ({ ...prev, lastName: e.target.value }))}
							ref={(el) => {
								inputRefs.current['lastName'] = el
							}}
						/>

						{getInputMessage('lastName')}
					</div>

					<div className='info-group'>
						<input
							type='text'
							id='preferredName'
							name='preferredName'
							autoComplete='given-name'
							placeholder='Preferred Name'
							value={updateValues.preferredName ?? ''}
							onChange={(e) => setUpdateValues((prev) => ({ ...prev, preferredName: e.target.value }))}
							ref={(el) => {
								inputRefs.current['preferredName'] = el
							}}
						/>

						{getInputMessage('preferredName')}
					</div>

					<div className='actions'>
						<button
							className='cancel-button'
							onClick={(e) => {
								e.stopPropagation()
								setFormResponse(null)
								setUpdateInput(null)
							}}
						>
							Cancel
						</button>

						<button
							className='save-button'
							onClick={async (e) => {
								e.stopPropagation()
								setFormResponse(null)

								const response = await apiClient.patch('/api/user', { updates: updateValues })

								setFormResponse(response)

								if (!response.passed) return

								const updatedUser = response.data as User

								setUser(updatedUser)
								setUpdateInput(null)
							}}
						>
							Save
						</button>
					</div>
				</>
			)}
		</div>
	)

	const passwordGroup = (
		<div id='password-info' className='info-container' onClick={() => setUpdateInput('password')}>
			<span className='label'>Password:</span>
			{updateInput !== 'password' ? (
				<>
					{!user ? (
						<span className='loading'>loading...</span>
					) : (
						<>
							<span className='user-value'>********</span>
						</>
					)}
				</>
			) : (
				<>
					<div className='info-group'>
						<input
							type='password'
							id='current-password'
							name='currentPassword'
							autoComplete='current-password'
							placeholder='Current Password'
							value={updateValues.currentPassword ?? ''}
							onChange={(e) => setUpdateValues((prev) => ({ ...prev, currentPassword: e.target.value }))}
							ref={(el) => {
								inputRefs.current['currentPassword'] = el
							}}
						/>

						{getInputMessage('currentPassword')}
					</div>

					<div className='info-group'>
						<input
							type='password'
							id='new-password'
							name='newPassword'
							autoComplete='new-password'
							placeholder='New Password'
							value={updateValues.newPassword ?? ''}
							onChange={(e) => setUpdateValues((prev) => ({ ...prev, newPassword: e.target.value }))}
							ref={(el) => {
								inputRefs.current['newPassword'] = el
							}}
						/>

						{getInputMessage('newPassword')}
					</div>

					<div className='info-group'>
						<input
							type='password'
							id='confirm-password'
							name='confirmation'
							autoComplete='new-password'
							placeholder='Confirm Password'
							value={updateValues.confirmation ?? ''}
							onChange={(e) => setUpdateValues((prev) => ({ ...prev, confirmation: e.target.value }))}
							ref={(el) => {
								inputRefs.current['confirmation'] = el
							}}
						/>

						{getInputMessage('confirmation')}
					</div>

					<div className='actions'>
						<button
							className='cancel-button'
							onClick={(e) => {
								e.stopPropagation()
								setUpdateInput(null)
							}}
						>
							Cancel
						</button>

						<button
							className='save-button'
							onClick={async (e) => {
								e.stopPropagation()
								setFormResponse(null)

								const response = await apiClient.patch('/api/auth/password', { params: updateValues })

								setFormResponse(response)

								if (!response.passed) return

								setUpdateInput(null)
							}}
						>
							Save
						</button>
					</div>
				</>
			)}
		</div>
	)

	return (
		<div id='profile-layout' className='main-content'>
			<section id='profile-form'>
				<h2>Account Details</h2>

				{avatarGroup}
				{usernameGroup}
				{nameGroup}
				{passwordGroup}
				{getGeneralMessage()}
			</section>
		</div>
	)
}

export default ProfilePortal
