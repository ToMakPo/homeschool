import { useState, useRef } from 'react'

import Modal from '../../components/modal/modal.component'
import Icon from '../../components/icon/icon.component'

import apiClient from '../../utils/api'
import type { User } from '../../utils/types'

import { useFamily } from '../../store/family'
import { useAuth } from '../../store/auth'

import './family.styles.scss'
import type { ApiResponse, ValidationResult } from '../../utils/api-response'

interface NewMember {
	username: string
	firstName: string
	lastName: string
	role: 'parent' | 'student'
	password: string
}

const FamilyPortal = () => {
	const user = useAuth((state) => state.user)
	const family = useFamily((state) => state.family)
	const members = useFamily((state) => state.members)
	const setMembers = useFamily((state) => state.setMembers)
	const fetchFamily = useFamily((state) => state.fetchFamily)

	const [createNewMember, setCreateNewMember] = useState<NewMember | null>(null)

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

	if (!user || !family) {
		return (
			<div id='family-portal' className='loading-state'>
				<h2>Loading family portal...</h2>
			</div>
		)
	}

	async function handleAdminToggle(member: User) {
		const newRole = member.isAdmin ? 'parent' : 'admin'

		const response = await apiClient.patch('/api/user', { targetId: member.id, updates: { role: newRole } })

		if (response.passed) {
			// setMembers(members.map((m) => (m.id === member.id ? { ...m, isAdmin: !m.isAdmin } : m)))
			await fetchFamily()
		} else {
			console.error(`Failed to update admin status for ${member.displayName}:`, response.message)
		}
	}

	async function handleNewMemberSubmit(e: React.SubmitEvent<HTMLFormElement>) {
		e.preventDefault()
		setFormResponse(null)

		const formData = new FormData(e.currentTarget)
		const data = Object.fromEntries(formData.entries())
		data.role = createNewMember?.role || 'student'

		try {
			const response = await apiClient.post('/api/family/create', data)
			setFormResponse(response)
			if (!response.passed) return

			await fetchFamily()
			setCreateNewMember(null)
			setFormResponse(null)
		} catch (error) {
			console.error('An error occurred while adding new member:', error)
		}
	}

	const newMemberFormRef = useRef<HTMLFormElement>(null)

	const newMemberModal = (
		<Modal id='new-member-modal' isOpen={!!createNewMember} onClose={() => setCreateNewMember(null)}>
			<h3>Add New Member</h3>
			<form id='new-member-form' ref={newMemberFormRef} onSubmit={handleNewMemberSubmit}>
				<div className='input-group'>
					<label htmlFor='new-member-username'>Username</label>
					<input
						type='text'
						id='new-member-username'
						name='username'
						required
						autoFocus
						autoComplete='new-username'
						value={createNewMember?.username || ''}
						onChange={(e) => setCreateNewMember({ ...createNewMember!, username: e.target.value })}
					/>
					{getInputMessage('username')}
				</div>

				<div className='input-group'>
					<label htmlFor='new-member-first-name'>First Name</label>
					<input
						type='text'
						id='new-member-first-name'
						name='firstName'
						required
						autoComplete='new-first-name'
						value={createNewMember?.firstName || ''}
						onChange={(e) => setCreateNewMember({ ...createNewMember!, firstName: e.target.value })}
					/>
					{getInputMessage('firstName')}
				</div>

				<div className='input-group'>
					<label htmlFor='new-member-last-name'>Last Name</label>
					<input
						type='text'
						id='new-member-last-name'
						name='lastName'
						required
						autoComplete='new-last-name'
						value={createNewMember?.lastName || ''}
						onChange={(e) => setCreateNewMember({ ...createNewMember!, lastName: e.target.value })}
					/>
					{getInputMessage('lastName')}
				</div>
				<div className='input-group'>
					<span className='label'>Role</span>
					<span id='new-member-role'>
						<span
							className={createNewMember?.role === 'parent' ? 'active' : ''}
							onClick={() => setCreateNewMember({ ...createNewMember!, role: 'parent' })}
							tabIndex={0}
						>
							Parent
						</span>
						<span
							className={createNewMember?.role === 'student' ? 'active' : ''}
							onClick={() => setCreateNewMember({ ...createNewMember!, role: 'student' })}
							tabIndex={0}
						>
							Student
						</span>
					</span>
					{getInputMessage('role')}
				</div>
				<div className='input-group'>
					<label htmlFor='new-member-password'>Password</label>
					<input
						type='password'
						id='new-member-password'
						name='password'
						required
						autoComplete='new-password'
						value={createNewMember?.password || ''}
						onChange={(e) => setCreateNewMember({ ...createNewMember!, password: e.target.value })}
					/>
					{getInputMessage('password')}
				</div>
				{getGeneralMessage()}
				<button type='submit'>Add Member</button>
			</form>
		</Modal>
	)

	return (
		<div id='family-portal' className='main-content'>
			<h2>{family.name}</h2>

			{/* Now you can safely map over members since the guard ensures everything is loaded */}
			<div id='members-list'>
				<h3>Family Members</h3>
				{members && members.length > 0 && (
					<ul>
						{members
							.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
							.map((member) => {
								console.log({ member, user, members })
								try {
									return (
										<li key={member.id}>
											{member.fullName + (member.preferredName ? ` (${member.preferredName})` : '')}
											<div className='member-pills'>
												{member.isStudent && <span className='pill pill-student'>student</span>}
												{member.isParent && <span className='pill pill-parent'>parent</span>}
												{!member.isOwner && member.isAdmin && <span className='pill pill-admin'>admin</span>}
												{member.isOwner && <span className='pill pill-owner'>owner</span>}
												{/* <span className={`pill pill-${member.role}`}>{member.role}</span> */}
												{member.id === user.id && <span className='pill pill-me'>me</span>}
											</div>
											{user.isOwner && member.isParent && member.id !== user.id && (
												<span className='admin-toggle input-group'>
													<label htmlFor={`admin-toggle-${member.id}`}>Admin</label>
													<input
														type='checkbox'
														id={`admin-toggle-${member.id}`}
														checked={member.isAdmin}
														onChange={() => handleAdminToggle(member)}
													/>
												</span>
											)}
										</li>
									)
								} catch (error) {
									console.error('Error rendering member:', member, error)
									return null
								}
							})}
					</ul>
				)}
				<Icon
					name='add'
					id='add-member-icon'
					onClick={() => setCreateNewMember({ username: '', firstName: '', lastName: user.lastName || '', role: 'parent', password: '' })}
				/>
			</div>
			{newMemberModal}
		</div>
	)
}

export default FamilyPortal
