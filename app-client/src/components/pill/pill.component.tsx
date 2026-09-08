import './pill.styles.scss'

interface PillProps {
	/** The text to display in the pill. */
	value: string

	/** The font size of the text in the pill. */
	fontSize?: number | string

	/** The background color of the pill. */
	bgColor?: string
}

const Pill = (props: PillProps) => {
	const value = props.value
	const fontSize = typeof props.fontSize === 'number' ? `${props.fontSize}px` : props.fontSize
	const bgColor = props.bgColor

	return (
		<span className='pill' style={{ fontSize, '--bg-color': bgColor } as React.CSSProperties}>
			{value}
		</span>
	)
}

export default Pill
