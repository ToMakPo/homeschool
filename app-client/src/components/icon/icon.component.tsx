import { forwardRef } from 'react'
import './icon.styles.scss'

export type MaterialSymbolVariant = 'outlined' | 'rounded' | 'sharp'

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
	/** The name of the icon to display, e.g., 'search', 'home', 'settings' */
	name: string
	/** The size of the icon. Can be a number (in pixels) or a string (e.g., '2rem', '24px', '1.5rem'). Defaults to 32 */
	size?: number | string
	/** The variant of the Material Symbol to use. Defaults to 'outlined' */
	variant?: MaterialSymbolVariant
	/** Whether the icon is filled. Defaults to false */
	filled?: boolean
	/** Whether the icon is disabled. Defaults to false */
	disabled?: boolean
	/** The foreground color of the icon */
	fgColor?: string
	/** The background color of the icon */
	bgColor?: string
	/** The weight of the icon, used to calculate the gradient. (Between 0 and 1, inclusive) */
	weight?: number
}

const Icon = forwardRef<HTMLSpanElement, IconProps>((props, ref) => {
	const {
		name,
		size = 32,
		variant = 'outlined',
		filled = false,
		disabled = false,
		fgColor,
		bgColor,
		weight = 0,
		className = '',
		style,
		onClick,
		...restProps
	} = props

	const classes = ['icon-component', onClick ? 'clickable' : '', disabled ? 'disabled' : '', className].filter(Boolean).join(' ')

	// Format layout size string for CSS
	const sizeStr = typeof size === 'number' ? `${size}px` : size

	// Parse out a safe, unitless number for optical sizing (opsz) between 20 and 48
	const sizeNum = (() => {
		if (typeof size === 'number') return size
		const parsed = parseFloat(size)
		if (isNaN(parsed)) return 32
		if (size.endsWith('rem') || size.endsWith('em')) return parsed * 16
		return parsed
	})()
	const safeOpsz = Math.min(Math.max(sizeNum, 20), 48)

	const inlinePadding = style?.padding || '0px'

	const styles = {
		'--size': sizeStr,
		'--fill': filled ? '1' : '0',
		'--weight': 400,
		'--weight-factor': weight,
		'--opsz': safeOpsz,
		'--padding-offset': inlinePadding,
		'color': fgColor,
		'backgroundColor': bgColor,
		...style
	} as React.CSSProperties

	const handleClick = (event: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
		if (disabled) {
			event.preventDefault()
			event.stopPropagation()
			return
		}
		onClick?.(event)
	}

	return (
		<span id={props.id} className={classes} style={styles} onClick={handleClick} {...restProps} ref={ref} aria-disabled={disabled}>
			<span className={`material-symbols-${variant} material-symbols`}>{name}</span>
		</span>
	)
})

Icon.displayName = 'Icon'

export default Icon
