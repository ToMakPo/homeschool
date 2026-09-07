import { useMemo } from 'react'

import PortalHeader from '../../layout/header/header.layout'
import NavPanel from '../../layout/nav-panel/nav-panel.layout'

import DashboardPage from '../../portal/dashboard/dashboard.portal'
import ProfilePage from '../../portal/profile/profile.portal'

import { useNavigation } from '../../store/navigation'

import './portal.styles.scss'

const ParentPortal = () => {
	const selectedLayout = useNavigation((state) => state.selectedPage)

	const mainLayout = useMemo(() => {
		switch (selectedLayout) {
			case 'dashboard':
				return <DashboardPage />
			case 'profile':
				return <ProfilePage />
			default:
				return null
		}
	}, [selectedLayout])

	return (
		<div id='parent-portal'>
			<NavPanel />
			<PortalHeader />
			{mainLayout}
		</div>
	)
}
export default ParentPortal
