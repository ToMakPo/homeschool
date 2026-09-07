import seedRandom from 'seedrandom'

import type { User } from '../../utils/types'

import './avatar.styles.scss'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
	user: User
	size?: number | string
}

const Avatar = (props: AvatarProps) => {
	const { user, size = 40, onClick, ...rest } = props

	const style: React.CSSProperties = {}
	const sizeStr = typeof size === 'number' ? `${size}px` : size
	style.width = sizeStr
	style.height = sizeStr

	const classNames = ['avatar-component', onClick ? 'clickable' : '', user.avatarUrl ? '' : 'initials'].filter(Boolean).join(' ')

	if (user.avatarUrl) {
		const url = 'http://localhost:3001' + user.avatarUrl // TODO: Replace with your server URL or use an environment variable
		return <img className={classNames} src={url} alt={`${user.displayName}'s avatar`} style={style} onClick={onClick} {...rest} />
	}

	const initials = (user.displayName[0] + user.lastName[0]).toUpperCase()
	const generator = seedRandom(user.id)
	const hue = Math.floor(generator() * 360)
	const saturation = Math.floor(generator() * 50) + 50
	const lightness = Math.floor(generator() * 40) + 30
	const bgColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`
	style.backgroundColor = bgColor
	style.color = `contrast-color(${bgColor})`
	style.fontSize = `calc(${sizeStr} / 2.25)`

	return (
		<div className={classNames} style={style} onClick={onClick} {...rest}>
			{initials}
		</div>
	)
}

export default Avatar
