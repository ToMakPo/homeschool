import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'

// import { Icon, iconDataList, type IconDataType } from '@portrait-displays/icon'
import Icon from '../icon/icon.component'

import './icon-grid.styles.scss'

const ICON_SIZE = 46
const ICON_GAP = 2
const ICON_PADDING = 5

const GRID_PADDING = 10
const ROW_COUNT = 8
const COLUMN_COUNT = 6

interface IconGridProps {
	id?: string
	className?: string

	/** The size of each icon in pixels. */
	iconSize?: number
	/** The gap between icons in pixels. */
	iconGap?: number
	/** The padding inside each icon in pixels. */
	iconPadding?: number

	/** The padding around the grid in pixels. */
	gridPadding?: number
	/** The number of rows in the icon grid. */
	rowCount?: number
	/** The number of columns in the icon grid. */
	columnCount?: number

	/** The id of the icon to select initially. */
	selectId?: string | null
	/** A filter string to filter the icons by. */
	filter?: string

	onSelect?: (icon: IconDataType | null) => void
}

interface IconGridRef {
	/** The icon that is currently selected. */
	selected: IconDataType | null
	/** The filter string currently applied to the icon list. */
	filter: string

	/** The total number of icons available after filtering. */
	iconCount: number
	/** The total number of pages available. */
	pageCount: number
	/** The current page number being viewed. */
	pageNumber: number
}

/**
 * A component that displays a selectable grid of icons with pagination and filtering capabilities.
 * 
 * Props:
 * - `iconSize` - The size of each icon in pixels.
 * - `iconGap` - The gap between icons in pixels.
 * - `iconPadding` - The padding inside each icon in pixels.
 * - `gridPadding` - The padding around the grid in pixels.
 * - `rowCount` - The number of rows in the icon grid.
 * - `columnCount` - The number of columns in the icon grid.
 * - `selectId` - The id of the icon to select initially.
 * - `filter` - A filter string to filter the icons by.
 * - `onSelect` - A callback function that is called when an icon is selected.
 *
 * Ref Methods:
 * - `selected` - The icon that is currently selected.
 * - `filter` - The filter string currently applied to the icon list.
 * - `iconCount` - The total number of icons available after filtering.
 * - `pageCount` - The total number of pages available.
 * - `pageNumber` - The current page number being viewed.
 */
const IconGrid = forwardRef<IconGridRef, IconGridProps>((props, ref) => {
	const gridRef = useRef<HTMLDivElement>(null)

	const iconSize = useMemo(() => props.iconSize || ICON_SIZE, [props.iconSize])
	const iconGap = useMemo(() => props.iconGap || ICON_GAP, [props.iconGap])
	const iconPadding = useMemo(() => props.iconPadding || ICON_PADDING, [props.iconPadding])

	const gridPadding = useMemo(() => props.gridPadding || GRID_PADDING, [props.gridPadding])
	const rowCount = useMemo(() => props.rowCount || ROW_COUNT, [props.rowCount])
	const columnCount = useMemo(() => props.columnCount || COLUMN_COUNT, [props.columnCount])

	const gridWidth = useMemo(() => columnCount * iconSize + (columnCount - 1) * iconGap + gridPadding * 2, [columnCount, iconSize, iconGap, gridPadding])
	const gridHeight = useMemo(() => rowCount * iconSize + (rowCount - 1) * iconGap + gridPadding * 2, [rowCount, iconSize, iconGap, gridPadding])

	/** The currently selected icon. */
	const [selected, setSelectedIcon] = useState<IconDataType | null>(null)
	/** Update the selected icon when the `selectId` prop changes. */
	useEffect(() => { selectIcon(props.selectId || null) }, [props.selectId])
	useEffect(() => { if (props.onSelect) props.onSelect(selected) }, [selected, props.onSelect])
	useEffect(() => { if (selected) navigateToSelectedIcon() }, [selected])

	/** The current filter string applied to the icon list. */
	const [filter, setFilter] = useState(props.filter || '')
	/** The list of icons after applying the filter. */
	const filteredIcons = useMemo(() => {
		const f = !filter ? '' : filter.toLowerCase()
			.replace(/\s+/g, '')
			.replace(/-/g, '')
			.replace(/^icon(?=.)/, '')
		return filter
			? iconDataList.filter(icon => icon?.id?.replace('-', '').includes(f))
				.sort((a, b) => {
					// Prioritize exact matches and those that start with the filter string.
					const x = a.id?.replace('-', '')
					const y = b.id?.replace('-', '')
					if (x === f && y !== f) return -1
					if (x !== f && y === f) return 1
					if (x?.startsWith(f) && !y?.startsWith(f)) return -1
					if (!x?.startsWith(f) && y?.startsWith(f)) return 1
					return x!.localeCompare(y!)
				})
			: [...iconDataList]
	}, [filter])

	/** The number of icons displayed per page. */
	const itemsPerPage = useMemo(() => rowCount * columnCount, [rowCount, columnCount])
	/** The total number of pages available based on the filtered icons. */
	const pageCount = useMemo(() => Math.ceil(filteredIcons.length / itemsPerPage) || 1, [filteredIcons, itemsPerPage])
	/** The current page number being viewed. */
	const [pageNumber, setCurrentPage] = useState(1)
	/** The page number where the currently selected icon is located.
	 * 
	 * If no icon is selected or the selected icon is not in the filtered list, returns null.
	 */
	const selectedIconPage = useMemo(() => {
		if (!selected) return null
		const index = filteredIcons.findIndex(icon => icon.id === selected.id)
		if (index === -1) return null
		return Math.floor(index / itemsPerPage) + 1
	}, [selected, filteredIcons, itemsPerPage])
	/** When the filtered icons or items per page change, ensure the selected icon remains visible.*/
	useEffect(() => {
		if (!selected) return
		const index = filteredIcons.findIndex(icon => icon.id === selected.id)
		if (index === -1) return
		const newPageNumber = Math.floor(index / itemsPerPage) + 1
		setCurrentPage(newPageNumber)
	}, [filteredIcons, itemsPerPage, selected])

	/**
	 * Select an icon by its id.
	 * 
	 * @param id The id of the icon to select.
	 * @returns The selected icon data or null if no icon is selected.
	 */
	const selectIcon = (id: string | null) => {
		id = id?.replace(/\s+/g, '-').toLowerCase() || null
		if (id === selected?.id) id = null

		const iconData = filteredIcons.find(icon => icon?.id === id) || null
		setSelectedIcon(iconData)

		if (props.onSelect) props.onSelect(iconData)

		return iconData
	}

	/**
	 * Navigate to the page containing the currently selected icon.
	 * 
	 * If no icon is selected, then you will be taken to the first page.
	 */
	const navigateToSelectedIcon = () => {
		setCurrentPage(selectedIconPage ?? 1)
	}

	/** Add event listeners for mouse wheel and middle mouse button clicks on the icon grid. */
	useEffect(() => {
		if (!gridRef.current) return

		// Handle mouse wheel events for pagination. Scrolling up or down while
		// hovering over the icon grid changes the page accordingly. Holding shift
		// while scrolling jumps by 10 pages.
		const handleWheel = (e: WheelEvent) => {
			if (e.deltaY === 0) return
			e.preventDefault()

			const pageJump = e.shiftKey ? 10 : 1

			if (e.deltaY > 0) {
				setCurrentPage(Math.min(pageCount, pageNumber + pageJump))
			} else {
				setCurrentPage(Math.max(1, pageNumber - pageJump))
			}
		}
		gridRef.current.addEventListener('wheel', handleWheel, { passive: false })

		// Handle middle mouse button clicks to navigate to the selected icon. Clicking
		// the middle mouse button while hovering over the icon grid will jump to the
		// page containing the currently selected icon if one is selected.
		const handleWheelDown = (e: MouseEvent) => {
			if (e.buttons === 4) {
				e.preventDefault()

				if (selected) setCurrentPage(selectedIconPage as number)
			}
		}
		gridRef.current.addEventListener('mousedown', handleWheelDown)

		return () => {
			if (!gridRef.current) return
			gridRef.current.removeEventListener('wheel', handleWheel)
			gridRef.current.removeEventListener('mousedown', handleWheelDown)
		}
	}, [pageNumber, pageCount, selected, filteredIcons, itemsPerPage])

	/**
	 * Determine whether to show the "Go to Selected Icon" navigation button.
	 * 
	 * This button is shown only when there is a selected icon, and it is not
	 * currently visible on the current page and the selected icon exists in the 
	 * filtered icon list.
	 */
	const showNavToSelectedIcon = useMemo(() => {
		if (!selected) return false
		const index = filteredIcons.findIndex(icon => icon.id === selected.id)
		if (index === -1) return false
		if (selectedIconPage === pageNumber) return false
		return true
	}, [selected, filteredIcons, selectedIconPage, pageNumber])

	useImperativeHandle(ref, () => ({
		selected,
		filter,

		iconCount: filteredIcons.length,
		pageCount,
		pageNumber,
	}), [selected, filter, filteredIcons, pageCount, pageNumber])

	/////////////////
	/// RENDERING ///
	/////////////////
	// #region Rendering
	const searchFilterEl = (
		<div className="search-filter">
			<input
				type="text"
				placeholder="Search icons..."
				value={filter}
				onChange={(e) => {
					setFilter(e.target.value)
					setCurrentPage(1) // Reset to first page on new search
				}}
				list="icon-names-list"
				onKeyDown={(e) => {
					if (e.key === 'Escape') {
						setFilter('')
					}
				}}
			/>

			<Icon name="search" className="search-icon" />
			<Icon name="x" className="clear-icon"
				onClick={() => { setFilter('') }}
			/>
		</div>
	)

	const iconsGridEl = (
		<div className="icon-list"
			style={{
				width: `${gridWidth}px`,
				height: `${gridHeight}px`,
				padding: `${gridPadding}px`,
			}}
			ref={gridRef}
		>
			<div className="icons-grid"
				style={{
					gridTemplateColumns: `repeat(${columnCount}, min-content)`,
					gap: `${iconGap}px`,
				}}
			>
				{filteredIcons
					.slice((pageNumber - 1) * itemsPerPage, pageNumber * itemsPerPage)
					.map(icon => {

						return (
							<Icon key={icon.id}
								data={icon}
								className={selected?.id === icon.id ? 'selected' : ''}
								size={iconSize}
								padding={iconPadding}
								borderWidth={2}
								title={icon.label}
								onClick={() => selectIcon(icon.id)}
							/>
						)
					})
				}
			</div>
		</div>
	)

	const selectedText = useMemo(() => {
		const buildCopyText = (label: string, value: string | undefined) => value && (
			<div className={`info copy-text icon-${label.replace(/\s+/g, '-').toLowerCase()}`}
				onClick={() => navigator.clipboard.writeText(value)}
			><strong>{label}:</strong> {value}
				<Icon name="copy" className="copy-icon" />
				<Icon name="check" className="copied-icon" />
			</div>
		)

		return (selected && ((
			<div className="selected-icon-text">
				<div className='info-text'>
					{buildCopyText('Label', selected.label)}
					{buildCopyText('Id', selected.id)}
					{buildCopyText('Name', 'Icon' + selected.id.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(''))}
					{buildCopyText('Description', selected.description)}
				</div>

				<Icon name="info-circle" className="selected-icon-info-icon" />
			</div>
		)))
	}, [selected])

	const [enterPageNumber, setEnterPageNumber] = useState<number | ''>(-1)
	const paginationEl = (
		<div className="pagination">
			<Icon name="chevron-left-pipe"
				className={'page-nav' + (pageNumber === 1 ? ' disabled' : '')}
				title="First Page"
				onClick={() => setCurrentPage(1)}
			/>
			<Icon name="chevron-left"
				className={'page-nav' + (pageNumber === 1 ? ' disabled' : '')}
				title="Previous Page"
				onClick={() => setCurrentPage(Math.max(1, pageNumber - 1))}
			/>

			{enterPageNumber !== -1 ? (
				<input
					className='page-numbers page-number-input'
					autoFocus
					value={enterPageNumber}
					onChange={(e) => {
						const val = e.target.value === '' ? '' : parseInt(e.target.value, 10)
						if (val !== '' && isNaN(val)) e.preventDefault()
						else setEnterPageNumber(val)
					}}
					onBlur={() => {
						const pn = enterPageNumber === '' ? pageNumber : enterPageNumber
						setCurrentPage(Math.min(Math.max(1, pn), pageCount))
						setEnterPageNumber(-1)
					}}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							const pn = enterPageNumber === '' ? pageNumber : enterPageNumber
							setCurrentPage(Math.min(Math.max(1, pn), pageCount))
							setEnterPageNumber(-1)
						} else if (e.key === 'Escape') {
							setEnterPageNumber(-1)
						}
					}}
					onFocus={(e) => {
						e.target.select()
					}}
				/>
			) : (
				<span className='page-numbers'
					onClick={() => setEnterPageNumber(pageNumber)}
				>Page {pageNumber} of {pageCount}</span>
			)}

			<Icon name="chevron-right"
				className={'page-nav' + (pageNumber === pageCount ? ' disabled' : '')}
				title="Next Page"
				onClick={() => setCurrentPage(Math.min(pageCount, pageNumber + 1))}
			/>
			<Icon name="chevron-right-pipe"
				className={'page-nav' + (pageNumber === pageCount ? ' disabled' : '')}
				title="Last Page"
				onClick={() => setCurrentPage(pageCount)}
			/>

			{showNavToSelectedIcon && (
				<Icon name="components"
					className={"go-to-selected-icon" + (selected ? '' : ' disabled')}
					title="Go to Selected Icon"
					onClick={navigateToSelectedIcon}
				/>
			)}
		</div>
	)

	return (
		<div className="icon-grid">
			{searchFilterEl}
			{iconsGridEl}
			{paginationEl}
			{selectedText}
		</div>
	)
})

export type { IconGridProps, IconGridRef }
export default IconGrid