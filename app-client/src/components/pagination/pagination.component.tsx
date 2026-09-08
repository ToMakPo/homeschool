import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import type { WheelEvent } from 'react'

import Icon from '../icon/icon.component'

import './pagination.styles.scss'

interface PaginationProps {
	/** The current active page number. (1-based index) */
	currentPage: number
	/** The total number of pages available.
	 * 
	 * If 1 or 0, pagination controls are hidden. 
	 */
	totalPages: number
	/** Callback function invoked when the page changes. */
	onPageChange: (page: number) => void
	/** The number of page buttons to display in the pagination control.
	 * 
	 * If 1, then shown in "Page N of X" mode.
	 * 
	 * (default: 5)
	 */
	buttonCount?: number
	/** The number of pages to scroll when using the mouse wheel with the Shift key held. */
	scrollStep?: number
	/** Whether to allow direct number input for page navigation. (default: true) */
	allowInput?: boolean
}

export interface PaginationRef {
	/** The current active page number. (1-based index) */
	pageNumber: number
	/** Trigger pagination scroll from outside the component. */
	handleScroll: (deltaY: number, shiftKey?: boolean) => void
}

const Pagination = forwardRef<PaginationRef, PaginationProps>((props, ref) => {
	const [pageNumber, setPageNumber] = useState<number>(1)
	useEffect(() => {
		goToPage(props.currentPage)
	}, [props.currentPage])

	const [totalPages, setTotalPages] = useState<number>(1)
	useEffect(() => {
		setTotalPages(props.totalPages)
	}, [props.totalPages])

	/** The number of page buttons to display in the pagination control.
	 * 
	 * If 1, then shown in "Page N of X" mode.
	 */
	const buttonCount = props.buttonCount !== undefined ? props.buttonCount : 7
	/** The number of pages to scroll when using the mouse wheel with the Shift key held. */
	const scrollStep = props.scrollStep || Math.max(2, Math.round(totalPages / 5))

	const allowInput = props.allowInput !== undefined ? props.allowInput : buttonCount === 1
	/** Used to input the page number directly. If not null, then input is displayed instead of the page number. */
	const [inputValue, setInputValue] = useState<string | null>(null)

	/** Navigates to the specified page number, ensuring it stays within valid bounds.
	 * If the requested page is the same as the current page, no action is taken.
	 * Otherwise, updates the current page state and triggers the onPageChange callback.
	 *
	 * @param pageNumber - The page number to navigate to.
	 */
	function goToPage(nextPageNumber: number) {
		nextPageNumber = Math.max(1, Math.min(props.totalPages, nextPageNumber))
		if (nextPageNumber === pageNumber) return // No change

		setPageNumber(nextPageNumber)
		props.onPageChange(nextPageNumber)
	}

	/** Handles scroll deltas to navigate between pages.
	 * 
	 * @param deltaY The wheel delta Y value.
	 * @param shiftKey Whether Shift is held.
	 * 
	 * If scrolling up, goes to previous page(s).
	 * If scrolling down, goes to next page(s).
	 * If Shift is held, scrolls by multiple pages at a time.
	 */
	function handleScroll(deltaY: number, shiftKey?: boolean) {
		const step = shiftKey ? scrollStep : 1

		if (deltaY < 0) { // Scroll up
			goToPage(pageNumber - step)
		} else if (deltaY > 0) { // Scroll down
			goToPage(pageNumber + step)
		}
	}

	/** Handles scroll events to navigate between pages. */
	function scrollHandler(scrollEvent: WheelEvent<HTMLSpanElement>) {
		handleScroll(scrollEvent.deltaY, scrollEvent.shiftKey)
	}

	useImperativeHandle(ref, () => ({
		pageNumber: pageNumber,
		handleScroll,
	}))

	const pageInputEl = (
		<input type="text"
			className="page-input"
			autoFocus
			value={inputValue ?? pageNumber.toString()}
			onChange={(e) => {
				const val = e.target.value
				setInputValue(val)
			}}
			onBlur={() => {
				if (inputValue === null || inputValue === '') return

				const val = parseInt(inputValue)

				if (!isNaN(val)) goToPage(val)
				setInputValue(null)
			}}
			onKeyDown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault()
					if (inputValue === null || inputValue === '') return
					const val = parseInt(inputValue)
					if (!isNaN(val)) goToPage(val)
					setInputValue(null)
					return
				}
				if (e.key === 'Escape') {
					e.preventDefault()
					setInputValue(null)
					return
				}
				if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
					e.preventDefault()
					let val = inputValue === null || inputValue === '' ? pageNumber : parseInt(inputValue)
					if (isNaN(val)) val = pageNumber
					if (e.key === 'ArrowUp') val++
					else val--
					goToPage(val)
					setInputValue(null)
				}
				if (e.key === 'Tab') {
					e.preventDefault()
					setInputValue(null)
				}
				if (e.key === 'Backspace'
					|| e.key === 'Delete'
					|| e.key === 'ArrowLeft'
					|| e.key === 'ArrowRight'
				) return
				if (!/^\d$/.test(e.key)) {
					e.preventDefault()
					return
				}
			}}
		/>
	)

	const pageButtonsEl = useMemo(() => {
		// If button count is 1 or less, show "Page N of X" mode.
		if (buttonCount <= 1) {
			return (
				<span
					className="page-of-total"
					onClick={() => allowInput && setInputValue(pageNumber.toString())}
				>
					Page {pageNumber} of {totalPages}
				</span>
			)
		}

		// Helper function to build a page button.
		const buildButton = (page: number) => (
			<span key={page}
				className={['page-button', page === pageNumber ? 'active' : ''].join(' ')}
				onClick={() => goToPage(page)}
			>{page}</span>
		)

		// Determine start and end page for buttons.
		const [startPage, endPage, needsEnd] = (() => {
			const halfButtonCount = Math.floor(buttonCount / 2)

			// Total pages less than or equal to button count, show all
			if (totalPages <= buttonCount)
				return [1, totalPages, false]

			// Near beginning
			if (pageNumber <= halfButtonCount)
				return [1, buttonCount - 2, true]

			// Near end
			if (pageNumber + halfButtonCount >= totalPages)
				return [totalPages - buttonCount + 1, totalPages, false]

			// Middle
			let start = Math.max(1, pageNumber - halfButtonCount)
			let end = start + buttonCount - 1
			if (end > totalPages) {
				end = totalPages
				start = Math.max(1, end - buttonCount + 1)
			}

			const needsEnd = end < totalPages

			return [start + 1, end - 1, needsEnd]
		})()

		// Build page buttons.
		const buttons = Array
			.from({ length: endPage - startPage + 1 - (needsEnd ? 0 : 0) })
			.map((_, index) => buildButton(startPage + index))

		// Add end button if needed.
		if (needsEnd) {
			buttons.push(<span key="sep" className="page-sep"></span>)
			buttons.push(buildButton(totalPages))
		}

		// Return the page buttons element.
		return (
			<span className="page-buttons">
				{buttons}
				{inputValue !== null && pageInputEl}
			</span>
		)
	}, [buttonCount, pageNumber, totalPages, inputValue, allowInput])

	// If only one page, do not render pagination controls
	if (totalPages <= 1) return null

	return (
		<div className="pagination component"
			onWheel={scrollHandler}
		>
			<Icon name="chevron-left-pipe"
				className={pageNumber === 1 ? 'disabled' : ''}
				onClick={() => goToPage(1)}
			/>
			<Icon name="chevron-left"
				className={pageNumber === 1 ? 'disabled' : ''}
				onClick={() => {
					if (pageNumber > 1) goToPage(pageNumber - 1)
				}}
			/>
			{pageButtonsEl}
			<Icon name="chevron-right"
				className={pageNumber === props.totalPages ? 'disabled' : ''}
				onClick={() => {
					if (pageNumber < props.totalPages) goToPage(pageNumber + 1)
				}}
			/>
			<Icon name="chevron-right-pipe"
				className={pageNumber === props.totalPages ? 'disabled' : ''}
				onClick={() => goToPage(props.totalPages)}
			/>
			{allowInput && buttonCount > 1 && (
				<Icon name="forms" 
					className="page-input-icon" 
					onClick={() => setInputValue(pageNumber.toString())}
				/>
			)}
		</div>
	)
})

Pagination.displayName = 'Pagination'

export default Pagination