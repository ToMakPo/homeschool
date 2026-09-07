import { useState } from 'react'

import Icon from '../../components/icon/icon.component'

import { getRoleKey } from '../../utils/globals'

import { useAuth } from '../../store/auth'
import { navigationItems, NavigationPage, useNavigation } from '../../store/navigation'

import './nav-panel.styles.scss'

const NavPanel = () => {
	const user = useAuth((state) => state.user)!
	const logout = useAuth((state) => state.logout)

	const [toggleState, setToggleExpanded] = useState<'expanded' | 'collapsed'>('expanded')

	const selectedPage = useNavigation((state) => state.selectedPage)
	const setSelectedPage = useNavigation((state) => state.setSelectedPage)

	const makeNavItem = (label: string, icon: string, navPage: NavigationPage | null, func: () => void, id?: string) => (
		<div
			id={id}
			key={label}
			className={['nav-item', navPage === selectedPage ? 'active' : ''].filter(Boolean).join(' ')}
			onClick={func}
			title={toggleState === 'collapsed' ? label : ''}
		>
			<Icon name={icon} size={25} />
			<span className='collapsable'>{label}</span>
		</div>
	)

	const navToggleButton = (
		<span
			id='nav-toggle-button'
			onClick={(e) => {
				e.stopPropagation()
				setToggleExpanded(toggleState === 'expanded' ? 'collapsed' : 'expanded')
			}}
		>
			<Icon
				name={toggleState === 'expanded' ? 'chevron_left' : 'chevron_right'}
				size={25}
				onClick={() => setToggleExpanded(toggleState === 'expanded' ? 'collapsed' : 'expanded')}
			/>
		</span>
	)

	const navigation = (
		<div id='navigation-items'>
			{navigationItems
				.filter(({ roles }) => roles.some((role) => user[getRoleKey(role)]))
				.map(({ label, icon, navPage }) =>
					makeNavItem(label, icon, navPage, () => setSelectedPage(navPage), `nav-item--${label.toLowerCase().replace(/\s+/g, '-')}`)
				)}
		</div>
	)

	const logoutButton = makeNavItem('Logout', 'logout', null, logout, 'logout-button')

	return (
		<div id='nav-panel' className={toggleState}>
			{navToggleButton}
			{navigation}
			{logoutButton}
		</div>
	)
}

export default NavPanel
