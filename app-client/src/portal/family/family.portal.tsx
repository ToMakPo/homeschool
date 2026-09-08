import { useAuth } from '../../store/auth'
import { useFamily } from '../../store/family'

import './family.styles.scss'

const FamilyPortal = () => {
	const user = useAuth((state) => state.user)
	const family = useFamily((state) => state.family)
	const members = useFamily((state) => state.members)

	if (!user || !family) {
		return (
			<div id='family-portal' className='loading-state'>
				<h2>Loading family portal...</h2>
			</div>
		)
	}

	return (
		<div id='family-portal'>
			<h2>{family.name}</h2>

			{/* Now you can safely map over members since the guard ensures everything is loaded */}
			<div className='members-list'>
				<h3>Family Members ({members.length})</h3>
				<ul>
					{members.map((member) => (
						<li key={member.id}>{member.fullName}</li>
					))}
				</ul>
			</div>
		</div>
	)
}

export default FamilyPortal
