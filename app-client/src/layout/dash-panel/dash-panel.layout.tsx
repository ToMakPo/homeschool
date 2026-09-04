import Avatar from '../../components/avatar/avatar.component'
import { useAuth } from '../../store/auth'
import { SelectedLayout, useNavigation } from '../../store/navigation'

import './dash-panel.styles.scss'

const DashPanelLayout = () => {
	const user = useAuth((state) => state.user)
	const logout = useAuth((state) => state.logout)

	const setSelectedLayout = useNavigation((state) => state.setSelectedLayout)

	if (!user) return <div>Loading...</div>

	type NavigationItem = {
		panel: SelectedLayout
		label: string
	}
	const navigationItems = [
		{ panel: 'dashboard', label: 'Dashboard' },
		{ panel: 'dashboardx', label: 'About' },
		{ panel: 'dashboardy', label: 'Take the Test' },
		{ panel: 'dashboardz', label: 'Contavt' }
	].filter(Boolean) as NavigationItem[]

	const navigation = (
		<div id='dash-panel-navigation'>
			{navigationItems.map(({ panel, label }) => (
				<div key={panel} className='nav-item' onClick={() => setSelectedLayout(panel)}>
					{label}
				</div>
			))}
		</div>
	)

	const footer = (
		<div id='dash-panel-footer'>
			<div id='user-info' onClick={() => setSelectedLayout('profile')}>
				<Avatar user={user} />
				<span className='display-name'>
					{user.displayName} {user.lastName}
				</span>
				<span className='role'>{user.role}</span>
			</div>

			<hr />
			<button id='logout-button' className='btn danger outline' onClick={() => logout()}>
				Logout
			</button>
		</div>
	)

	return (
		<div id='dash-panel-layout'>
			{navigation}
			{footer}
		</div>
	)
}

export default DashPanelLayout
