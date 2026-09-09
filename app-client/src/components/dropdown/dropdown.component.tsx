import { forwardRef, Fragment, isValidElement, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { Dispatch, HTMLAttributes, SetStateAction, JSX } from 'react'

import Icon from '../icon/icon.component'

import './dropdown.styles.scss'

export type DropdownValue = string | number | boolean | Date | null | undefined
export type DropdownLabel = string | JSX.Element

export interface DropdownProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick' | 'onChange'> {
	/** The current value of the dropdown.
	 *
	 * This can be a string, number, boolean, Date, null, or undefined.
	 *
	 * If the value is not in the options, the dropdown will display "Select an option".
	 */
	value: DropdownValue
	/** The onChange handler for the dropdown.
	 *
	 * This is called when the dropdown's value changes. The new value is passed
	 * as the first argument.
	 *
	 * @param value The new value of the dropdown.
	 * @returns void
	 */
	onChange: (value: DropdownValue) => void | Dispatch<SetStateAction<undefined>>
	/** The options in the dropdown.
	 *
	 * This can be an array of options or groups. Groups will be rendered as nested
	 * options.
	 */
	options: (DropdownOption | DropdownGroup)[]

	/** The placeholder text to display when no option is selected. */
	placeholder?: DropdownLabel

	/** Whether the dropdown is disabled.
	 *
	 * If true, the dropdown will be rendered as disabled and cannot be opened.
	 * The value of the dropdown will not change and the onClick handler will not
	 * be called when the dropdown is clicked.
	 */
	disabled?: boolean
	/** Function to call when the dropdown menu is opened. */
	onOpen?: (options: FlatMap<DropdownOption>) => void
	/** Function to call when the dropdown menu is closed. */
	onClose?: (options: FlatMap<DropdownOption>) => void
	/** Whether to close the dropdown when an option is selected.
	 *
	 * By default, the dropdown menu will close when an option is selected. If
	 * this is set to false, the menu will remain open.
	 *
	 * Either way, the onClick and onChange handlers will still be called when an
	 * option is selected.
	 */
	closeOnSelect?: boolean
	/** Whether to close the dropdown when clicking outside of it.
	 *
	 * By default, the dropdown menu will close when clicking outside of it. If
	 * this is set to false, the menu will remain open.
	 */
	closeOnBlur?: boolean
	/** Whether to show a clear button when an option is selected.
	 *
	 * If true, a clear button will be shown when an option is selected. Clicking
	 * the clear button will set the dropdown's value to undefined and call the
	 * onChange handler with undefined.
	 *
	 * By default, this is false.
	 */
	showClearButton?: boolean

	/** Styles for the dropdown button.
	 *
	 * This can be used to customize the appearance of the dropdown button.
	 *
	 * Note: You can change the color of the glow when the dropdown is open by
	 * setting the CSS variable `--glow`.
	 *
	 * @example
	 * buttonStyle={{ '--glow': 'var(--color-secondary)' } as React.CSSProperties}
	 */
	buttonStyle?: React.CSSProperties
	/** Styles for the dropdown menu.
	 *
	 * This can be used to customize the appearance of the dropdown menu.
	 */
	menuStyle?: React.CSSProperties

	ref?: React.Ref<HTMLDivElement>
}

export interface DropdownGroup {
	/** The key of the group.
	 *
	 * This is used to identify the group and its expanded/collapsed state.
	 * If not provided, a key will be generated based on the label and options.
	 */
	key?: string
	/** The label of the option.
	 *
	 * This can be a string or a JSX element that will be displayed in the dropdown.
	 */
	label: DropdownLabel
	/** The options in the group.
	 *
	 * This can be an array of options or sub-groups. Sub-groups will be rendered
	 * as nested dropdowns.
	 */
	options: (DropdownOption | DropdownGroup)[]
	/** Whether the group is expandable.
	 *
	 * If true, the group will be rendered as a collapsible section that can be
	 * expanded or collapsed.
	 * If false, the group will be rendered as a non-collapsible section.
	 *
	 * By default, groups are not expandable.
	 */
	expandable?: boolean
	/** Whether the group is expanded.
	 *
	 * If expandable is false, this property is ignored and the group will always
	 * be rendered as expanded.
	 *
	 * If true, the group will be rendered as expanded.
	 * If false, the group will be rendered as collapsed.
	 *
	 * By default, groups are expanded.
	 */
	expanded?: boolean
	/** Whether the group is disabled.
	 *
	 * If true, the group and all its options will be rendered as disabled.
	 */
	disabled?: boolean
	/** Function to call when the group is expanded from a collapsed state.
	 *
	 * This is called when the user expands the group. It is not called when the
	 * dropdown is first rendered with the group expanded.
	 */
	onExpand?: () => void
	/** Function to call when the group is collapsed from an expanded state.
	 *
	 * This is called when the user collapses the group. It is not called when the
	 * dropdown is first rendered with the group collapsed.
	 */
	onCollapse?: () => void
}

export interface DropdownOption {
	/** The key of the option.
	 *
	 * This is used to identify the option and its selected state.
	 * If not provided, a key will be generated based on the label and value.
	 */
	key?: string
	/** The label of the option.
	 *
	 * This can be a string or a JSX element that will be displayed in the dropdown.
	 *
	 * If not provided, the value will be used as the label.
	 */
	label?: DropdownLabel
	/** The label to display in the dropdown button when this option is selected.
	 *
	 * If not provided, the label will be used.
	 */
	display?: DropdownLabel
	/** The value of the option.
	 *
	 * Selecting this option will set the dropdown's value to this value, and will
	 * call the onClick handler with this value.
	 *
	 * This can be a string, number, boolean, Date, null, or undefined.
	 *
	 * To prevent the dropdown's value from changing when this option is selected,
	 * either set this value to undefined or set the preventValueChange property
	 * to true. In either case, the onClick handler will still be called with
	 * this value.
	 */
	value: DropdownValue
	/** Whether the option is disabled.
	 *
	 * If true, the option will be rendered as disabled and cannot be selected.
	 * The value of the dropdown will not change and the onClick handler will not
	 * be called when this option is clicked.
	 */
	disabled?: boolean
	/** Whether this option should be selectable.
	 *
	 * If true, selecting this option will set the dropdown's value to this
	 * option's value.
	 *
	 * If false, selecting this option will not change the dropdown's value, but
	 * the onClick handler will still be called with this option's value.
	 *
	 * By default, options are selectable.
	 */
	selectable?: boolean
	/** Function to call when the option is clicked.
	 *
	 * This is called when the option is clicked, regardless of whether the
	 * dropdown's value changes.
	 *
	 * @param event The click event.
	 * @param value The value of the option that was clicked.
	 */
	onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, value: DropdownValue) => void
	/** Function to call when the option is selected.
	 *
	 * This function is only called when this specific option is selected. It is
	 * called in addition to the dropdown's onChange handler, which is called for
	 * all selectable options when they are selected.
	 *
	 * Note: If this option is not selectable, or is disabled, or is in a disabled
	 * group, this function will not be called when the option is clicked.
	 *
	 * @param value The value of the option that was selected.
	 */
	onSelect?: (value: DropdownValue) => void
}

export interface DropdownManager {
	/** Opens the dropdown.
	 *
	 * If the dropdown is already open, this will do nothing.
	 * If the dropdown is disabled, this will do nothing.
	 */
	open: () => void
	/** Closes the dropdown.
	 *
	 * If the dropdown is already closed, this will do nothing.
	 */
	close: () => void

	/** Gets the current value of the dropdown. */
	getValue: () => DropdownValue
	/** Gets the currently selected option in the dropdown.
	 *
	 * If the dropdown's value is not in the options, this will return null.
	 */
	getSelected: () => DropdownOption | null
}

type FlatMap<T extends { key?: unknown }> = Record<string, Omit<T, 'key'> & Required<Pick<T, 'key'>>>
type GroupWithFlags = DropdownGroup & {
	key: string
	depth: number
	parent: GroupWithFlags | null
	inheritDisable: boolean
	children?: (GroupWithFlags | OptionWithFlags)[]
}
type OptionWithFlags = DropdownOption & {
	key: string
	depth: number
	parent: GroupWithFlags | null
	inheritDisable: boolean
}

/** Extracts the text content from a React node.
 *
 * This function recursively traverses the React node and returns only the text
 * content, stripping out any HTML tags or JSX elements.
 *
 * @param node The React node to extract text from.
 * @returns The text content of the node as a string.
 */
function extractTextFromNode(node: React.ReactNode): string {
	if (!node) return ''

	if (typeof node === 'string' || typeof node === 'number') {
		return String(node)
	}

	// If it's an array of elements (like siblings inside a tag)
	if (Array.isArray(node)) {
		return node.map(extractTextFromNode).join('')
	}

	// If it's a valid React element, check its children props
	if (isValidElement(node)) {
		const children = (node.props as { children?: React.ReactNode }).children
		return extractTextFromNode(children)
	}

	return ''
}

/** Generates a unique key for a dropdown option or group.
 *
 * This function checks for a provided key, then falls back to the value or label.
 * If none of those are available, it generates a random string as a last resort.
 *
 * @param item The dropdown option or group to generate a key for.
 * @returns A unique string key for the item.
 */
function getKey(item: DropdownOption | DropdownGroup): string {
	if (item.key) return item.key

	if ('value' in item) return String(item.value)

	if ('label' in item) {
		if (typeof item.label === 'string') return item.label
		const labelText = extractTextFromNode(item.label)
		if (labelText) return labelText
	}

	return Math.random().toString(36).substring(2, 15)
}

//////////////////////////
/// DROPDOWN COMPONENT ///
//////////////////////////
// #region Component

export const Dropdown = forwardRef<DropdownManager, DropdownProps>((props, ref) => {
	const {
		value: givenValue,
		onChange,
		options,
		placeholder = 'Select an option',
		disabled: dropdownDisabled = false,
		onOpen,
		onClose,
		closeOnSelect = true,
		closeOnBlur = true,
		showClearButton = false,
		className,
		buttonStyle,
		menuStyle,
		...rest
	} = props

	const [isOpen, setIsOpen] = useState(false)
	const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

	const { hierarchy, groupsMap, optionsMap } = useMemo(() => {
		const hierarchy: (GroupWithFlags | OptionWithFlags)[] = []
		const groupsMap: FlatMap<GroupWithFlags> = {}
		const optionsMap: FlatMap<OptionWithFlags> = {}

		function flatten(items: (DropdownOption | DropdownGroup)[], parent: GroupWithFlags | null = null, depth: number = 0) {
			if (!items || items.length === 0) return

			items.forEach((item) => {
				const key = getKey(item)
				const inheritDisable = parent ? parent.disabled || parent.inheritDisable : dropdownDisabled

				if ('value' in item) {
					/// DropdownOption ///
					const option: OptionWithFlags = {
						...item,
						selectable: item.selectable ?? true,
						key,
						parent,
						inheritDisable,
						depth
					}
					optionsMap[key] = option
					;(parent ? parent.children! : hierarchy).push(option)
				} else {
					/// DropdownGroup ///
					const group: GroupWithFlags = {
						...item,
						expandable: item.expandable ?? false,
						key,
						parent,
						inheritDisable,
						depth,
						children: []
					}
					groupsMap[key] = group
					;(parent ? parent.children! : hierarchy).push(group)

					flatten(item.options, group, depth + 1)
				}
			})
		}
		flatten(options || [])

		return { hierarchy, groupsMap, optionsMap }
	}, [options, dropdownDisabled])

	const value = useMemo(() => {
		// If the given value is in the options, return it. Otherwise, return undefined.
		if (givenValue === undefined) return undefined
		const found = Object.values(optionsMap).find((opt) => opt.value === givenValue)
		return found ? givenValue : undefined
	}, [givenValue, optionsMap])

	const wrapperRef = useRef<HTMLDivElement>(null)
	const menuRef = useRef<HTMLDivElement>(null)

	// Handle clicks outside the dropdown to close the dropdown menu.
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
				close()
			}
		}

		// Only attach the listener if the dropdown is actually open and the option to
		// close on outside click is enabled.
		if (isOpen && closeOnBlur) {
			document.addEventListener('mousedown', handleClickOutside)
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isOpen, closeOnBlur])

	useEffect(() => {
		if (!isOpen) return

		const frameId = requestAnimationFrame(() => {
			if (!menuRef.current) return

			const activeElement = menuRef.current.querySelector('.dropdown-option.selected') as HTMLElement | null

			if (!activeElement) return

			activeElement.scrollIntoView({
				behavior: 'smooth',
				block: 'center',
				inline: 'center'
			})
		})

		return () => cancelAnimationFrame(frameId)
	}, [isOpen, value, optionsMap])

	// Close the dropdown when the viewport size changes or the dropdown wrapper
	// is resized.
	useEffect(() => {
		const observer = new ResizeObserver(close)
		if (wrapperRef.current) {
			observer.observe(wrapperRef.current)
		}

		window.addEventListener('resize', close)

		return () => {
			observer.disconnect()
			window.removeEventListener('resize', close)
		}
	}, [])

	///////////////////////////////////////////
	/// FUNCTIONS TO CONTROL DROPDOWN STATE ///
	///////////////////////////////////////////
	// #region Functions

	function open() {
		if (dropdownDisabled) return

		setIsOpen(true)
		onOpen?.(optionsMap)
	}

	function close() {
		setIsOpen(false)
		onClose?.(optionsMap)
	}

	function toggle(opened: boolean = !isOpen) {
		opened ? open() : close()
	}

	function getValue() {
		return value
	}

	function getSelected() {
		return Object.values(optionsMap).find((opt) => opt.value === value) || null
	}

	function handleOptionClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>, option: OptionWithFlags) {
		// If the option is disabled, do nothing.
		if (option.disabled || option.inheritDisable) return

		// If the option allows value change, update the internal value.
		if (option.selectable) {
			onChange?.(option.value)
			option.onSelect?.(option.value)
		}

		// If the option has an onClick handler, call it with the event and the option's value.
		option.onClick?.(e, option.value)

		// If the dropdown allows closing on change, close the dropdown.
		if (closeOnSelect && option.selectable) close()
	}

	function handleGroupClick(group: GroupWithFlags | string) {
		// If the group is a string, look it up in the flatGroups map.
		if (typeof group === 'string') group = groupsMap[group]

		// If the group is not found, do nothing.
		if (!group) return

		// If the group is expandable, toggle its expanded/collapsed state.
		handleGroupExpandToggle(group.key ?? getKey(group))
	}

	function handleGroupExpandToggle(group: GroupWithFlags | string, expanded?: boolean) {
		// If the group is a string, look it up in the flatGroups map.
		if (typeof group === 'string') group = groupsMap[group]

		// If the group is not found, do nothing.
		if (!group) return

		// If the group is not expandable, don't do anything.
		if (group.expandable === false) return

		// Toggle the expanded/collapsed state of the group.
		setExpandedGroups((prev) => {
			// If expanded is provided, use it. Otherwise, toggle the current state.
			expanded = expanded ?? !(prev[group.key ?? getKey(group)] ?? group.expanded ?? true)

			// Update the state with the new expanded/collapsed state of the group.
			return { ...prev, [group.key ?? getKey(group)]: expanded }
		})

		// Call the onExpand or onCollapse handler if provided.
		if (expanded) {
			group.onExpand?.()
		} else {
			group.onCollapse?.()
		}
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
		if (dropdownDisabled) return

		// Toggle the menu open/closed state when the user presses Enter or Space.
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault()
			toggle()
			return
		}

		// Close the menu when the user presses Escape.
		if (e.key === 'Escape') {
			e.preventDefault()
			toggle(false)
			return
		}

		// Close the menu when the user presses Tab to move focus away from the dropdown.
		if (e.key === 'Tab') {
			toggle(false)
			return
		}

		const navigableOptions = Object.values(optionsMap).filter((opt) => !opt.disabled && !opt.inheritDisable && opt.selectable)
		if (navigableOptions.length === 0) return

		const currentIndex = navigableOptions.findIndex((opt) => opt.value === value)

		// Navigate to the next selectable option when the user presses ArrowDown.
		if (e.key === 'ArrowDown') {
			e.preventDefault()
			const nextIndex = (currentIndex + 1) % navigableOptions.length
			const target = navigableOptions[nextIndex]
			onChange?.(target.value)
			target.onSelect?.(target.value)
			return
		}

		// Navigate to the previous selectable option when the user presses ArrowUp.
		if (e.key === 'ArrowUp') {
			const prevIndex = ((currentIndex === -1 ? 0 : currentIndex) - 1 + navigableOptions.length) % navigableOptions.length
			const target = navigableOptions[prevIndex]
			onChange?.(target.value)
			target.onSelect?.(target.value)
			return
		}

		// Navigate to the first selectable option when the user presses Home.
		if (e.key === 'Home') {
			e.preventDefault()
			const target = navigableOptions[0]
			onChange?.(target.value)
			target.onSelect?.(target.value)
			return
		}

		// Navigate to the last selectable option when the user presses End.
		if (e.key === 'End') {
			e.preventDefault()
			const target = navigableOptions[navigableOptions.length - 1]
			onChange?.(target.value)
			target.onSelect?.(target.value)
			return
		}

		// Clear the dropdown's value when the user presses Delete or Backspace.
		if (e.key === 'Delete' || e.key === 'Backspace') {
			e.preventDefault()
			if (!showClearButton) return
			onChange?.(undefined)
			return
		}

		// Navigate to the next selectable option that starts with the typed character
		// when the user presses a letter or number key.
		if (e.key.length === 1 && e.key.match(/^[a-zA-Z0-9]$/)) {
			e.preventDefault()

			const char = e.key.toLowerCase()

			let nextIndex = currentIndex

			while (true) {
				nextIndex = (nextIndex + 1) % navigableOptions.length
				const target = navigableOptions[nextIndex]

				// If we have looped all the way around and are back at the current index,
				// break to avoid an infinite loop.
				if (nextIndex === currentIndex) break

				// If the target option's label starts with the typed character
				const label = (
					typeof target.label === 'string' ? target.label : target.label === undefined ? 'undefined' : extractTextFromNode(target.label)
				).toLowerCase()

				if (label.startsWith(char)) {
					onChange?.(target.value)
					target.onSelect?.(target.value)
					return
				}
			}

			return
		}
	}

	////////////////////////////////////
	/// RENDERING DROPDOWN COMPONENT ///
	////////////////////////////////////
	// #region Rendering

	/// Expose the internal properties and methods to the parent component ///
	useImperativeHandle(ref, () => ({ open, close, getValue, getSelected }))

	const combinedClassName = ['dropdown-component', className].filter(Boolean).join(' ')

	const dropdownButton = (() => {
		const selectedOption = getSelected()
		const buttonLabel = selectedOption?.display ?? selectedOption?.label ?? selectedOption?.value?.toString() ?? placeholder ?? ''

		return (
			<div
				className={['dropdown-button', isOpen ? 'open' : '', dropdownDisabled ? 'disabled' : ''].filter(Boolean).join(' ')}
				onClick={() => toggle()}
				aria-disabled={dropdownDisabled}
				style={buttonStyle}
				tabIndex={dropdownDisabled ? -1 : 0}
			>
				<div className='dropdown-button-content'>
					<div className='dropdown-current-value'>{buttonLabel}</div>

					{/* Hidden options container used purely to force max-width layout */}
					<div className='dropdown-sizer-pool' aria-hidden='true'>
						<div className='dropdown-sizer-item'>{placeholder}</div>
						{Object.values(optionsMap).map((option) => (
							<Fragment key={option.key + '-fragment'}>
								<div
									key={option.key + '-label'}
									className='dropdown-sizer-item'
									style={
										{
											'--depth': option.depth
										} as React.CSSProperties
									}
								>
									{option.label ?? option.value?.toString() ?? ''}
								</div>
								<div
									key={option.key + '-display'}
									className='dropdown-sizer-item'
									style={
										{
											'--depth': option.depth
										} as React.CSSProperties
									}
								>
									{option.display}
								</div>
							</Fragment>
						))}
						{Object.values(groupsMap).map((group) => (
							<div
								key={group.key + '-group'}
								className='dropdown-sizer-item'
								style={
									{
										'--depth': group.depth
									} as React.CSSProperties
								}
							>
								{group.label}
							</div>
						))}
					</div>
				</div>

				<span className='dropdown-action-buttons'>
					{value !== undefined && showClearButton && (
						<Icon
							name='x'
							className='dropdown-clear-icon'
							onClick={(e) => {
								e.stopPropagation()
								onChange?.(undefined)
							}}
						/>
					)}
					<Icon name='chevron-down' className={['dropdown-button-chevron', isOpen ? 'open' : ''].filter(Boolean).join(' ')} />
				</span>
			</div>
		)
	})()

	const dropdownMenu = (() => {
		const renderOptions = (items: (GroupWithFlags | OptionWithFlags)[]): JSX.Element[] => {
			return items
				.map((item) => {
					if ('value' in item) {
						// Render a dropdown option
						const optionKey = getKey(item)
						const selected = item.value === value

						return (
							<div
								key={optionKey}
								className={[
									'dropdown-option',
									selected ? 'selected' : '',
									item.disabled || item.inheritDisable ? 'disabled' : '',
									item.selectable ? 'selectable' : 'not-selectable'
								]
									.filter(Boolean)
									.join(' ')}
								onClick={(e) => handleOptionClick(e, item)}
								style={
									{
										'--depth': item.depth
									} as React.CSSProperties
								}
							>
								{item.label}
							</div>
						)
					}

					if ('options' in item && item.options.length > 0) {
						// Render a dropdown group
						const groupKey = getKey(item)
						const isExpanded = expandedGroups[groupKey] ?? item.expanded ?? true

						return (
							<div key={groupKey} className='dropdown-group'>
								<div
									className={[
										'dropdown-group-header',
										item.disabled || item.inheritDisable ? 'disabled' : '',
										item.expandable
											? [
													'expandable',
													isExpanded ? 'expanded' : 'collapsed',
													(isExpanded && item.onCollapse) || (!isExpanded && item.onExpand) ? 'clickable' : ''
												]
											: []
									]
										.flat()
										.filter(Boolean)
										.join(' ')}
									onClick={() => handleGroupClick(item)}
									style={
										{
											'--depth': item.depth
										} as React.CSSProperties
									}
								>
									{item.label}
									{item.expandable !== false && (
										<span className={['dropdown-group-toggle', isExpanded ? 'expanded' : 'collapsed'].join(' ')}>{isExpanded ? '+' : '-'}</span>
									)}
								</div>
								{isExpanded && <div className='dropdown-group-options'>{renderOptions(item.children ?? [])}</div>}
							</div>
						)
					}

					return null
				})
				.filter(Boolean) as JSX.Element[]
		}

		return (
			<div className={['dropdown-options', isOpen ? 'open' : ''].filter(Boolean).join(' ')} style={menuStyle} ref={menuRef} tabIndex={-1}>
				{renderOptions(hierarchy)}
			</div>
		)
	})()

	return (
		<div className={combinedClassName} ref={wrapperRef} {...rest} onKeyDown={handleKeyDown}>
			{dropdownButton}
			{dropdownMenu}
		</div>
	)
})

Dropdown.displayName = 'Dropdown'

export default Dropdown
