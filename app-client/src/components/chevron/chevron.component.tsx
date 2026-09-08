import './chevron.styles.scss'

interface ChevronProps {
	direction: 'right' | 'down' | 'left' | 'up'
	width?: number | string
	height?: number | string
	strokeColor?: string
	strokeWidth?: number | string

	id?: string
	className?: string
	style?: React.CSSProperties
	onClick?: (event: React.MouseEvent<HTMLSpanElement, MouseEvent>) => void
}

const ChevronIcon = (props: ChevronProps) => {
	const { direction, id, onClick } = props
	const className = [`chevron-icon`, props.className, onClick && 'clickable'].filter(Boolean).join(' ')
	const style: React.CSSProperties = {
		...(props.style || {}),
		...(props.width !== undefined ? { '--wd': typeof props.width === 'number' ? `${props.width}px` : props.width } : {}),
		...(props.height !== undefined ? { '--ht': typeof props.height === 'number' ? `${props.height}px` : props.height } : {}),
		...(props.strokeColor !== undefined ? { '--stroke-color': props.strokeColor } : {}),
		...(props.strokeWidth !== undefined ? { '--stroke-width': typeof props.strokeWidth === 'number' ? `${props.strokeWidth}px` : props.strokeWidth } : {}),
	} as React.CSSProperties

	return <span id={id} className={className} data-dir={direction} style={style} onClick={onClick} />
}

export default ChevronIcon
