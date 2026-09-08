import { useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { createPortal } from 'react-dom'

import Icon from '../icon/icon.component'

import './modal.styles.scss'

type SizeOption =
	| 'xs'
	| 'extra-small'
	| 'sm'
	| 'small'
	| 'md'
	| 'medium'
	| 'lg'
	| 'large'
	| 'xl'
	| 'extra-large'
	| 'fs'
	| 'full-screen'
	| 'fc'
	| 'fit-content'

type OpenState = 'closed' | 'opening' | 'opened' | 'closing'

interface ModalProps {
	/** An optional id for the modal element. */
	id?: string
	/** An optional className to apply to the modal element. */
	className?: string
	/** An optional style object to apply to the modal element. */
	style?: React.CSSProperties

	/** The size of the modal.
	 *
	 * The size prop determines the width of the modal. The height will adjust
	 * automatically based on the content.
	 *
	 * All size options are designed to be responsive and will adjust
	 * appropriately on different screen sizes. No matter which size option is
	 * chosen, the modal will never exceed the viewport width and height. If the
	 * content exceeds the available space, the modal will become scrollable.
	 *
	 * The available size options are:
	 * - `fc` | `fit-content` - Modal size adjusts to fit its content. This is
	 * the default size if no size prop is provided.
	 * - `xs` | `extra-small` - Extra small modal, ideal for very brief messages
	 * or notifications.
	 * - `sm` | `small` - Small modal, typically used for simple messages
	 * or confirmations.
	 * - `md` | `medium` - Medium modal, suitable for forms or more detailed content.
	 * - `lg` | `large` - Large modal, ideal for complex forms, images, or
	 * extensive content.
	 * - `xl` | `extra-large` - Extra large modal, used for very complex content
	 * or extensive content.
	 * - `fs` | `full-screen` - Modal takes up the entire viewport, often
	 * used for immersive experiences or mobile devices.
	 */
	size?: SizeOption

	/** Whether the modal is shown or hidden.
	 *
	 * When `show` is true, the modal will be displayed after a short in transition.
	 *
	 * When `show` is false, the modal will be hidden and unmounted from the DOM
	 * after a slide out transition.
	 */
	show: boolean

	/** A callback function that is called to close the modal.
	 *
	 * This can be triggered by various user interactions, such as clicking the
	 * close button, clicking on the backdrop, pressing the Escape key, or when
	 * the show prop changes from true to false.
	 *
	 * The function can either be a state setter function that takes a boolean
	 * value or a simple function that performs the close action.
	 *
	 * If it's a state setter, it will be called with `false` to indicate that the
	 * modal should be closed.
	 */
	close: Dispatch<SetStateAction<boolean>> | (() => void)

	/** Optional callback function that is called when the modal is opened.
	 *
	 * This triggered after the modal has finished its opening transition and is
	 * fully visible to the user. It can be used to perform any actions that need
	 * to occur once the modal is open, such as focusing an input field or
	 * starting animations.
	 */
	onOpen?: () => void
	/** Optional callback function that is called when the modal is closed.
	 *
	 * This is triggered after the modal has finished its closing transition and
	 * is no longer visible to the user. It can be used to perform any cleanup
	 * actions or state updates that need to occur once the modal is closed.
	 */
	onClose?: () => void

	/** Whether to show a close button in the top-right corner of the modal.
	 *
	 * Defaults to true.
	 */
	showCloseButton?: boolean
	/** Whether clicking on the backdrop should close the modal.
	 *
	 * Defaults to true.
	 */
	backdropClosable?: boolean
	/** Whether pressing the Escape key should close the modal.
	 *
	 * Defaults to true.
	 */
	escapeKeyClosable?: boolean

	/** The content to be displayed inside the modal. */
	children?: React.ReactNode
}

/** A Modal component.
 *
 * The Modal component is a versatile and customizable popup display element that
 * can be used to show important information, gather user input, or display
 * complex content without navigating away from the current page.
 */
const Modal: React.FC<ModalProps> = (props) => {
	//////////////////
	/// PROPERTIES ///
	//////////////////
	// #region Properties
	const showCloseButton = props.showCloseButton ?? true
	const backdropClosable = props.backdropClosable ?? true
	const escapeKeyClosable = props.escapeKeyClosable ?? true
	const size = useMemo(() => {
		switch (props.size) {
			case 'xs':
			case 'extra-small':
				return 'extra-small'
			case 'sm':
			case 'small':
				return 'small'
			case 'md':
			case 'medium':
				return 'medium'
			case 'lg':
			case 'large':
				return 'large'
			case 'xl':
			case 'extra-large':
				return 'extra-large'
			case 'fs':
			case 'full-screen':
				return 'full-screen'
			case 'fc':
			case 'fit-content':
			default:
				return 'fit-content'
		}
	}, [props.size])
	const { onOpen, onClose } = props
	const modalRef = useRef<HTMLDialogElement>(null)

	////////////////////////////
	/// OPEN AND CLOSE LOGIC ///
	////////////////////////////
	// #region Open/Close
	useEffect(() => {
		if (props.show) {
			openModal()
		} else {
			closeModal()
		}
	}, [props.show])

	const [openState, setOpenState] = useState<OpenState>('closed')
	useEffect(() => {
		switch (openState) {
			case 'opening':
				// Shows the modal and immediately transitions to the 'opened' state.
				modalRef.current?.showModal()
				setOpenState('opened')
				break
			case 'opened':
				// When the modal is in the 'closed' state, it is not rendered in the DOM. If
				// we try to apply the 'opened' state immediately when showing the modal, the
				// CSS transition won't work because the modal will be rendered with the
				// 'opened' styles right away. By first showing the modal in the 'opening'
				// state, we allow it to render with the initial hidden styles, and then we
				// can transition to the 'opened' state on the next tick.
				if (onOpen) onOpen()
				break
			case 'closing':
				// When the modal is in the 'closing' state, it is still rendered in the DOM
				// but visually hidden with a closing animation. We use a timeout to wait for
				// the duration of the closing animation before actually unmounting the modal
				// from the DOM and transitioning to the 'closed' state.
				setTimeout(() => setOpenState('closed'), 300)
				break
			case 'closed':
				// When the modal is closed, we want to make sure it's actually hidden and not
				// just visually hidden. By calling `modalRef.current?.close()`, we ensure that
				// the modal is properly closed and unmounted from the DOM after the closing
				// transition is complete.
				modalRef.current?.close()
				if (onClose) onClose()
				break
		}
	}, [openState])

	/** Handles opening the modal. */
	function openModal() {
		if (openState == 'opened' || openState == 'opening') return
		setOpenState('opening')
	}

	/** Handles closing the modal. */
	function closeModal() {
		// If the modal is already closed or in the process of closing, we don't
		// want to trigger the close logic again. This prevents issues like
		// multiple rapid close attempts.
		if (openState == 'closed' || openState == 'closing') return

		setOpenState('closing')
		props.close(false)
	}

	/** Handles clicks on the backdrop to close the modal.
	 *
	 * This first checks if `backdropClosable` is true. If not, it returns early
	 * and does nothing.
	 *
	 * If it is true, it then checks if the click event occurred outside the modal
	 * content by comparing the click coordinates with the bounding rectangle of
	 * the modal.
	 *
	 * If the click was outside the modal content, it calls `closeModal()`.
	 *
	 * If the click was inside the modal content, it does nothing, allowing users
	 * to interact with the content without accidentally closing the modal.
	 */
	function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
		if (!backdropClosable || !modalRef.current) return

		e.stopPropagation()
		e.preventDefault()

		const rect = modalRef.current.getBoundingClientRect()
		const clickedInContent = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom

		if (!clickedInContent) {
			closeModal()
		}
	}

	/** Handles the onCancel event to close the modal when the Escape key is pressed.
	 *
	 * The onCancel event is triggered when the user tries to close the modal
	 * using the Escape key. By default, the dialog element will close when the
	 * Escape key is pressed. However, we want to control this behavior based on
	 * the `escapeKeyClosable` prop.
	 *
	 * When the onCancel event is triggered, we first call `e.preventDefault()` to
	 * prevent the default behavior of closing the modal immediately. This allows
	 * us to check if `escapeKeyClosable` is true before allowing the modal to close.
	 */
	function handleOnCancel(e: React.FormEvent<HTMLDialogElement>) {
		e.preventDefault()

		if (!escapeKeyClosable) return

		closeModal()
	}

	/** Handles the onClose event to manage the closing state of the modal.
	 *
	 * When the user presses the Escape key the first time, the handleOnCancel
	 * function is able to catch it and prevent the modal from closing if
	 * `escapeKeyClosable` is false.
	 *
	 * However, because of the way the dialog element works, if the user presses
	 * the Escape key a second time, the onClose event will be triggered
	 * regardless. To prevent this, we need to catch it here as well.
	 */
	function handleOnClose(e: React.FormEvent<HTMLDialogElement>) {
		if (openState !== 'closing') {
			e.preventDefault()

			// Re-open immediately to cancel native close
			if (modalRef.current && !modalRef.current.open) {
				modalRef.current.showModal()
			}
		}
	}

	////////////////////////
	/// RENDER COMPONENT ///
	////////////////////////
	// #region Render
	const className = [
		props.className?.split(' ') ?? '',
		'modal-component',
		`size-${size}`,
		backdropClosable ? 'backdrop-click' : '',
		openState === 'closing' ? 'closing' : openState === 'opened' ? 'opened' : ''
	]
		.flat()
		.filter(Boolean)
		.join(' ')

	const component = (
		<dialog
			id={props.id}
			className={className}
			style={props.style}
			ref={modalRef}
			onCancel={handleOnCancel}
			onClick={handleBackdropClick}
			onClose={handleOnClose}
		>
			{showCloseButton && <Icon name='close' className='modal-close-button' onClick={closeModal} />}
			{props.children}
		</dialog>
	)

	return createPortal(openState !== 'closed' && component, document.body)
}

export type { ModalProps, SizeOption }
export default Modal
