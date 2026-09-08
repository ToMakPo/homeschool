import Avatar from '../../components/avatar/avatar.component'

import { useAuth } from '../../store/auth'
import { useNavigation } from '../../store/navigation'

import './header.styles.scss'

const PortalHeader = () => {
	const user = useAuth((state) => state.user)!
	const getPageTitle = useNavigation((state) => state.getPageTitle)
	const setSelectedPage = useNavigation((state) => state.setSelectedPage)

	return (
		<header id='portal-header'>
			<h1>{getPageTitle()}</h1>

			<div id='user-actions'>
				{/* TODO: Add notifications */}
				<Avatar user={user} onClick={() => setSelectedPage('profile')} />
			</div>
		</header>
	)
}

export default PortalHeader
