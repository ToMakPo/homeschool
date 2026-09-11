import { useMemo } from 'react'

import PortalHeader from '../../layout/header/header.layout'
import NavPanel from '../../layout/nav-panel/nav-panel.layout'

import DashboardPage from '../../portal/dashboard/dashboard.portal'
import SubjectsPage from '../../portal/subjects/subjects.portal'
import FamilyPage from '../../portal/family/family.portal'
import ProfilePage from '../../portal/profile/profile.portal'

import { useNavigation } from '../../store/navigation'

import './portal.styles.scss'

const ParentPortal = () => {
	const setSelectedPage = useNavigation((state) => state.selectedPage)

	const mainLayout = useMemo(() => {
		switch (setSelectedPage) {
			case 'dashboard':
				return <DashboardPage />
			case 'subjects':
				return <SubjectsPage />
			case 'profile':
				return <ProfilePage />
			case 'family':
				return <FamilyPage />
			default:
				return null
		}
	}, [setSelectedPage])

	return (
		<div id='parent-portal'>
			<NavPanel />
			<PortalHeader />
			{mainLayout}
		</div>
	)
}
export default ParentPortal
