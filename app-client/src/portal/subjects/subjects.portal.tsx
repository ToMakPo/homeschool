import { useState } from 'react'

import Icon from '../../components/icon/icon.component'
import Modal from '../../components/modal/modal.component'

import './subjects.styles.scss'

interface NewSubject {
	name: string
	icon: string
	description: string
	color: string
}

const SubjectsPortal = () => {
	const [createNewSubject, setCreateNewSubject] = useState<NewSubject | null>(null)

	const addSubjectModal = (
		<Modal id='add-subject-modal' show={!!createNewSubject} close={() => setCreateNewSubject(null)}>
			<h3>Add New Subject</h3>
			<form>
				<div className='form-group'>
					<label htmlFor='subject-name'>Name</label>
					<input
						type='text'
						id='subject-name'
						value={createNewSubject?.name || ''}
						onChange={(e) => setCreateNewSubject((prev) => ({ ...prev!, name: e.target.value }))}
					/>
				</div>

				<div className='form-group'>
					<label htmlFor='subject-icon'>Icon</label>
					<input
						type='text'
						id='subject-icon'
						value={createNewSubject?.icon || ''}
						onChange={(e) => setCreateNewSubject((prev) => ({ ...prev!, icon: e.target.value }))}
					/>
				</div>

				<div className='form-group'>
					<label htmlFor='subject-description'>Description</label>
					<textarea
						id='subject-description'
						value={createNewSubject?.description || ''}
						onChange={(e) => setCreateNewSubject((prev) => ({ ...prev!, description: e.target.value }))}
					></textarea>
				</div>

				<div className='form-group'>
					<label htmlFor='subject-color'>Color</label>
					<input
						type='color'
						id='subject-color'
						value={createNewSubject?.color || '#000000'}
						onChange={(e) => setCreateNewSubject((prev) => ({ ...prev!, color: e.target.value }))}
					/>
				</div>

				<div className='form-actions'>
					<button type='submit'>Add Subject</button>
				</div>
			</form>
		</Modal>
	)

	return (
		<div id='subjects-portal' className='main-content'>
			<div className='subjects-content'>
				<header>
					<h2>Subjects</h2>
					<Icon name='add' onClick={() => setCreateNewSubject({ name: '', icon: '', description: '', color: '#000000' })} />
				</header>
			</div>
			{addSubjectModal}
		</div>
	)
}

export default SubjectsPortal
