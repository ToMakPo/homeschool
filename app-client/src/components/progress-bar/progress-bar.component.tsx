import './progress-bar.styles.scss'

interface ProgressBarProps {
	/** The id for the progress bar container. */
	id?: string
	/** The class name for the progress bar container. */
	className?: string
	/** The custom styles for the progress bar container. */
	style?: React.CSSProperties

	/** The percentage of the progress bar to be filled.
	 *
	 * A value between 0 and 100 representing the percentage of the progress bar
	 * that is filled.
	 *
	 * If the value is `null`, the progress bar will be displayed in an
	 * indeterminate state. This will show an animation indicating that the
	 * progress cannot be determined at this time.
	 *
	 * The indeterminate state is typically used when the progress of an operation
	 * cannot be measured or when the operation is ongoing without a known end.
	 */
	percentage: number | null

	/** The fill color for the progress bar.
	 *
	 * This can be a single color or an array of colors for a gradient.
	 *
	 * This defaults to the application's primary color.
	 *
	 * If an array of colors is provided, the progress bar will display a
	 * linear gradient from left to right using the specified colors. As the
	 * progress fills, more of the gradient will be revealed.
	 *
	 * By default, gradient colors are evenly distributed across the filled
	 * portion of the progress bar. However, you can customize the distribution of
	 * colors in the gradient by adding percentage stops to the color values.
	 *
	 * For example: `['red', 'yellow 10%', 'green 15%', 'green 85%', 'yellow 90%', 'red']`
	 * would create a gradient that transitions from red to yellow at 10%, then to
	 * green at 15%, stays green until 85%, transitions back to yellow at 90%, and
	 * finally transitions back to red at 100%.
	 */
	fill?: string | string[] | null

	/** Controls the shimmer effect on the progress bar.
	 *
	 * When `shimmer` is enabled, a moving highlight will animate across the
	 * filled portion of the progress bar.
	 *
	 * The shimmer effect is typically used to indicate an indeterminate loading
	 * state or to add visual interest while the progress bar is filling.
	 *
	 * By default, the shimmer effect is enabled when the percentage is less than
	 * 100%, and disabled when the percentage reaches 100%. However, you can
	 * override this behavior by explicitly setting the `shimmer` prop.
	 *
	 * - If set to a number, it will specify the speed of the shimmer effect in seconds.
	 * - If set to `true`, the shimmer effect will be enabled with a default speed.
	 * - If set to `false` or `0`, the shimmer effect will be disabled.
	 */
	shimmer?: boolean | number
}

/** The default shimmer duration in seconds. */
const SHIMMER = 5

const ProgressBar = (props: ProgressBarProps) => {
	const id = props.id

	// Clamp percentage between 0 and 100
	const percentage = props.percentage === null ? null : Math.max(0, Math.min(100, props.percentage))

	const className = [
		'progress-bar-component',
		percentage === null ? 'progress-unknown' : percentage < 100 ? 'progress-incomplete' : 'progress-complete',
		props.className
	]
		.filter(Boolean)
		.join(' ')

	const fill = [props.fill].flat().filter(Boolean) as string[]
	if (fill.length === 0) fill.push('var(--color-primary, #586888)') // Default fill color

	// Generate the background fill colors for the progress bar, applying a
	// transparency to create a layered effect.
	const bgFill = fill.map((color) => {
		const [c, p] = color.split(' ', 2)
		return `hsl(from ${c} h s l / 0.35)` + (p ? ' ' + p : '')
	})

	const shimmer =
		percentage === null
			? 0
			: typeof (props.shimmer ?? percentage < 100) === 'boolean'
				? (props.shimmer ?? percentage < 100)
					? SHIMMER
					: 0
				: props.shimmer

	const bgStyle = {
		'--fg-fill': fill.join(', '),
		'--bg-fill': bgFill.join(', '),
		'--percentage': `${percentage ?? 100}%`,
		'--shimmer': `${shimmer}s`,
		...props.style
	} as React.CSSProperties

	return <div id={id} className={className} style={bgStyle} />
}

export type { ProgressBarProps }
export default ProgressBar
