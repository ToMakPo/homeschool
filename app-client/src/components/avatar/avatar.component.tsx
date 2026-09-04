import seedRandom from 'seedrandom'

import type { User } from '../../utils/types'

import './avatar.styles.scss'

interface AvatarProps {
	user: User
	size?: number | string
	onClick?: () => void
}

const Avatar = ({ user, size = 40, onClick }: AvatarProps) => {
	const style: React.CSSProperties = {}
	size = typeof size === 'number' ? `${size}px` : size
	style.width = size
	style.height = size

	if (user.avatarUrl) {
		const url = 'http://localhost:3001' + user.avatarUrl // TODO: Replace with your server URL or use an environment variable
		return <img className='avatar-component' src={url} alt={`${user.displayName}'s avatar`} style={style} onClick={onClick} />
	}

	const initials = (user.displayName[0] + user.lastName[0]).toUpperCase()
	const generator = seedRandom(user.id)
	const hue = Math.floor(generator() * 360)
	const saturation = Math.floor(generator() * 50) + 50
	const lightness = Math.floor(generator() * 40) + 30
	const bgColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`
	style.backgroundColor = bgColor
	style.color = `contrast-color(${bgColor})`
	style.fontSize = `calc(${size} / 2.25)`

	return (
		<div className='avatar-component initials' style={style} onClick={onClick}>
			{initials}
		</div>
	)
}

export default Avatar
