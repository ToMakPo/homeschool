import { useMemo } from 'react'
import DashPanelLayout from '../../layout/dash-panel/dash-panel.layout'
import DashboardLayout from '../../layout/dashboard/dashboard.layout'
import ProfileLayout from '../../layout/profile/profile.layout'

import { useAuth } from '../../store/auth'
import { useNavigation } from '../../store/navigation'

import './parent.styles.scss'

const ParentPortal = () => {
	const user = useAuth((state) => state.user)
	const selectedLayout = useNavigation((state) => state.selectedLayout)

	if (!user) return <div>Loading...</div>

	const mainLayout = useMemo(() => {
		switch (selectedLayout) {
			case 'dashboard':
				return <DashboardLayout />
			case 'profile':
				return <ProfileLayout />
			default:
				return null
		}
	}, [selectedLayout])

	return (
		<div id='parent-portal'>
			<DashPanelLayout />
			{mainLayout}
		</div>
	)
}
export default ParentPortal
