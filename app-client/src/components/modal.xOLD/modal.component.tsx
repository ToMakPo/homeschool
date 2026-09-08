import { useEffect, useRef } from 'react'

import Icon from '../icon/icon.component'

import './modal.styles.scss'

interface ModalProps {
	id?: string
	className?: string

	isOpen: boolean
	onClose: () => void

	size?: 'fit' | 'small' | 'medium' | 'large'

	children: React.ReactNode

	closeOnEscape?: boolean
	closeOnBackdrop?: boolean
	closeOnCloseButton?: boolean
}

const Modal = (params: ModalProps) => {
	const {
		id,
		className,
		isOpen,
		onClose,
		size = 'fit',

		children,
		closeOnEscape = true,
		closeOnBackdrop = true,
		closeOnCloseButton = true
	} = params

	const modalRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!isOpen) return

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && closeOnEscape) {
				onClose()
			}
		}

		window.addEventListener('keydown', handleKeyDown)

		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [isOpen, onClose])

	function handleBackdropClick(event: React.MouseEvent<HTMLDivElement>) {
		event.stopPropagation()
		event.preventDefault()

		if (closeOnBackdrop && event.target === event.currentTarget) {
			onClose()
		}
	}

	if (!isOpen) return null

	const classNames = ['modal-component', className ?? '', isOpen ? 'open' : '', size ?? ''].filter(Boolean).join(' ')

	return (
		<div id={id} className={classNames} onClick={handleBackdropClick} role='dialog' aria-modal='true'>
			<div className='modal-content' ref={modalRef} onClick={(event) => event.stopPropagation()}>
				{closeOnCloseButton && <Icon name='close' className='modal-close' onClick={onClose} aria-label='Close modal' />}

				{children}
			</div>
		</div>
	)
}

export default Modal
