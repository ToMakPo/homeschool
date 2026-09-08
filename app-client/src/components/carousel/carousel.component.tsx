import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react'

import ChevronIcon from '../chevron/chevron.component'

import './carousel.styles.scss'

interface CarouselProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
	/** The frames to display in the carousel. */
	frames: React.ReactNode[]
	/** Callback function that is called when the user navigates to a different frame.
	 *
	 * @param newIndex The index of the newly displayed frame.
	 */
	onChange?: (newIndex: number) => void
	/** Whether the carousel should loop between the first and last frames.
	 *
	 * If true, when the user reaches the last frame and clicks next, the carousel
	 * will loop back to the first frame. Similarly, when the user is on the first
	 * frame and clicks previous, the carousel will loop to the last frame.
	 *
	 * If false, the carousel will not loop and will stop at the first and last frames.
	 *
	 * Default: true
	 */
	loop?: boolean
	/** Whether to show the navigation dots at the bottom of the carousel.
	 *
	 * Default: true
	 */
	showDots?: boolean
}

export interface CarouselRef {
	/** Navigate to a specific frame in the carousel.
	 *
	 * @param frameIndex The index of the frame to navigate to. This should be a
	 * number between 0 and the index of the last frame in the carousel or 'next'
	 * to go to the next frame or 'prev' to go to the previous frame.
	 */
	goToFrame: (frameIndex: number | 'next' | 'prev') => void
}

const Carousel = forwardRef<CarouselRef, CarouselProps>((props, ref) => {
	const { frames = [], onChange, loop = true, className, ...divProps } = props
	const noFrames = !frames || frames.length === 0
	// If there are no frames, we still want to render a single empty frame.
	const frameCount = frames.length || 1

	// Whether the user is currently scrolling the carousel.
	const [scrolling, setScrolling] = useState(false)

	// The index of the currently displayed frame.
	const [currentIndex, setIndex] = useState(0)
	const onFirstFrame = useMemo(() => currentIndex === 0, [currentIndex])
	const onLastFrame = useMemo(() => currentIndex === frameCount - 1, [currentIndex, frameCount])

	// Animation state for a single frame bounce effect.
	const [bounceDirection, setBounceDirection] = useState<'left' | 'right' | 'shake' | null>(null)
	const bounceDuration = 400 // Duration of the bounce animation in milliseconds

	// Ref attached to the container used to pause media assets.
	const containerRef = useRef<HTMLDivElement>(null)

	// Ref attached to the component used to listen for keyboard and mouse events.
	const componentRef = useRef<HTMLDivElement>(null)

	// If the frames length changes, ensure the index is still valid.
	useEffect(() => {
		if (currentIndex >= frameCount) setIndex(frameCount - 1)
	}, [frames, frameCount, currentIndex])

	useEffect(() => {
		const element = componentRef.current
		if (!element) return

		element.addEventListener('keydown', handleKeyDown, { passive: false })
		element.addEventListener('wheel', handleScroll, { passive: false })

		return () => {
			element.removeEventListener('keydown', handleKeyDown)
			element.removeEventListener('wheel', handleScroll)
		}
	}, [currentIndex, frameCount, scrolling, loop])

	/////////////////
	/// FUNCTIONS ///
	/////////////////
	// #region Functions

	/** Navigate to a specific frame in the carousel.
	 *
	 * If the frame index is out of bounds, the carousel will either loop to the
	 * other end of the carousel (if looping is enabled) or trigger a bounce
	 * animation (if looping is disabled). This will also happen if there is only
	 * one frame in the carousel, as there is nowhere to navigate to.
	 *
	 * If the frame index is the same as the current index, nothing will happen.
	 * This prevents unnecessary re-renders and media asset pauses when the user
	 * clicks on the same frame they are already viewing.
	 *
	 * If the frame index is valid, the carousel will pause any media assets in
	 * the current frame before navigating to the new frame. This prevents media
	 * assets from continuing to play in the background after the user has
	 * navigated away from the frame.
	 *
	 * @param gotoIndex The index of the frame to navigate to. This should be a
	 * number between 0 and the index of the last frame in the carousel or 'next'
	 * to go to the next frame or 'prev' to go to the previous frame.
	 */
	function goToFrame(gotoIndex: number | 'next' | 'prev') {
		// Prevent navigation while the carousel is animating
		if (scrolling) return

		// If the frame index is 'next' or 'prev', calculate the new index based on
		// the current index.
		if (gotoIndex === 'next') {
			gotoIndex = currentIndex + 1
		} else if (gotoIndex === 'prev') {
			gotoIndex = currentIndex - 1
		}

		// Determine the direction of the slide animation based on the new index.
		const slide = gotoIndex > currentIndex ? 'right' : gotoIndex < currentIndex ? 'left' : null

		// Check if the new index is out of bounds.
		const breakStart = gotoIndex < 0
		const breakEnd = gotoIndex >= frameCount

		// If the frame index is out of bounds, trigger a bounce animation and do not
		// change the index. If the carousel is not looping, the user cannot navigate
		// past the first or last frame.
		if (frameCount === 1 || (!loop && (breakStart || breakEnd))) {
			triggerSingleFrameBounce(slide || 'shake')
			startScroll()
			return
		}

		// If the frame index is out of bounds and the carousel is looping, wrap the
		// index around to the other end of the carousel.
		while (gotoIndex < 0) gotoIndex += frameCount
		gotoIndex = gotoIndex % frameCount

		// If the frame index is the same as the current index, do nothing.
		if (gotoIndex === currentIndex) {
			triggerSingleFrameBounce('shake')
			startScroll()

			return
		}

		/// CHECKS HAVE PASSED ///

		// Pause any media assets in the carousel before changing the index.
		pauseMedia()

		// Update the index and call the onChange callback if provided.
		startScroll()
		setIndex(gotoIndex)
		onChange?.(gotoIndex)
	}

	/** Pause all media assets (video and audio) in the carousel.
	 *
	 * This is used to pause any media assets when the user navigates away from
	 * the frame, so that they do not continue playing in the background. This is
	 * especially important for video and audio assets, as they can continue
	 * playing even when the user is not viewing them, which can be distracting
	 * and consume system resources.
	 */
	function pauseMedia() {
		if (!containerRef.current) return

		const videos = containerRef.current.querySelectorAll('video')
		videos.forEach((video) => video.pause())

		const audios = containerRef.current.querySelectorAll('audio')
		audios.forEach((audio) => audio.pause())
	}

	/** Trigger a bounce animation. */
	function triggerSingleFrameBounce(direction: 'left' | 'right' | 'shake') {
		setBounceDirection(direction)
	}

	function startScroll() {
		setScrolling(true)

		// Clear the bounce animation once it has completed.
		setTimeout(stopScroll, bounceDuration)
	}

	function stopScroll() {
		setScrolling(false)
		setBounceDirection(null)
	}

	/** When the user presses the left or right arrow keys, switch frames.
	 *
	 * - **right arrow key**: go to next frame
	 * - **left arrow key**: go to previous frame
	 */
	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'Enter' || event.key === 'PageDown') {
			event.preventDefault()
			goToFrame('next')
			return
		}

		if (event.key === 'ArrowLeft' || event.key === 'Backspace' || event.key === 'Delete' || event.key === 'PageUp') {
			event.preventDefault()
			goToFrame('prev')
			return
		}

		if (event.key === 'Home') {
			event.preventDefault()
			goToFrame(0)
			return
		}

		if (event.key === 'End') {
			event.preventDefault()
			goToFrame(frameCount - 1)
			return
		}

		if (event.key === 'Tab' && event.shiftKey && currentIndex > 0) {
			event.preventDefault()
			goToFrame('prev')
			return
		}

		if (event.key === 'Tab' && !event.shiftKey && currentIndex < frameCount - 1) {
			event.preventDefault()
			goToFrame('next')
			return
		}
	}

	/** When the user scrolls the mouse wheel, switch frames.
	 *
	 * - **scroll down**: go to next frame
	 * - **scroll up**: go to previous frame
	 */
	function handleScroll(event: WheelEvent) {
		event.preventDefault()

		if (event.deltaY > 0) {
			goToFrame('next')
		} else if (event.deltaY < 0) {
			goToFrame('prev')
		}
	}

	/** Handle click on the next arrow button. */
	function handleNextArrowClick() {
		goToFrame('next')
	}

	/** Handle click on the previous arrow button. */
	function handlePrevArrowClick() {
		goToFrame('prev')
	}

	/** Handle click on a dot button. */
	function handleDotClick(dotIndex: number) {
		goToFrame(dotIndex)
	}

	useImperativeHandle(ref, () => ({ goToFrame }), [goToFrame])

	///////////////////////
	/// RENDER CAROUSEL ///
	///////////////////////
	// #region Render

	const frameContainer = (
		<div
			className={[
				'carousel-frame-container',
				bounceDirection === 'shake' ? 'shake' : bounceDirection ? `bounce-${bounceDirection}` : '',
				className
			]
				.filter(Boolean)
				.join(' ')}
			ref={containerRef}
		>
			<div className='carousel-frame-slider' style={{ '--index': currentIndex } as React.CSSProperties}>
				{!noFrames ? (
					frames.map((frame, i) => (
						<div key={i} className={['carousel-frame', i === currentIndex ? 'active' : ''].filter(Boolean).join(' ')} data-index={i}>
							{frame}
						</div>
					))
				) : (
					<div className={['carousel-frame', 'active', 'empty'].filter(Boolean).join(' ')} data-index={0}>
						{'No frames to display.'}
					</div>
				)}
			</div>
		</div>
	)

	/** The left arrow button to navigate to the previous frame. */
	const leftArrow = (
		<span
			className={['carousel-prev-arrow', 'carousel-arrow', noFrames || (!loop && onFirstFrame) ? 'disabled' : ''].filter(Boolean).join(' ')}
			onClick={handlePrevArrowClick}
		>
			<ChevronIcon direction='left' height='3rem' />
		</span>
	)

	/** The right arrow button to navigate to the next frame. */
	const rightArrow = (
		<span
			className={['carousel-next-arrow', 'carousel-arrow', noFrames || (!loop && onLastFrame) ? 'disabled' : ''].filter(Boolean).join(' ')}
			onClick={handleNextArrowClick}
		>
			<ChevronIcon direction='right' height='3rem' />
		</span>
	)

	/** Small navigation dots at the bottom of the carousel.
	 *
	 * These dots indicate the number of frames in the carousel and allow the user
	 * to navigate to a specific frame by clicking on the corresponding dot. The
	 * currently active frame's dot is highlighted.
	 *
	 * If there is only one frame in the carousel, the dots will not be displayed.
	 */
	const dots = frameCount > 1 && (
		<div className='carousel-dots'>
			{frames.map((_, dotIndex) => (
				<span
					key={dotIndex}
					className={['carousel-dot', dotIndex === currentIndex ? 'active' : ''].filter(Boolean).join(' ')}
					onClick={() => handleDotClick(dotIndex)}
				/>
			))}
		</div>
	)

	return (
		<div className={['carousel-component', className].filter(Boolean).join(' ')} tabIndex={0} data-index={currentIndex} {...divProps}>
			{frameContainer}

			{leftArrow}
			{rightArrow}

			{dots}
		</div>
	)
})

export default Carousel
