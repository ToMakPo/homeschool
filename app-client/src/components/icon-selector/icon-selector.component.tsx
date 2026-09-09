import { useEffect, useMemo, useState } from 'react'

// import { Icon, type IconDataType, type IconType, type TablerIdType } from "@portrait-displays/icon"
// import { AssetSelector, type AssetType } from '@portrait-displays/asset-selector'
// import { CodeInput } from '@portrait-displays/code-input'
import IconGrid from '../icon-grid/icon-grid.component'

import './icon-selector.styles.scss'

interface IconSelectorProps {
	icon?: IconType | TablerIdType | null

	show?: boolean
	onSave?: (newIcon: IconType | TablerIdType | null) => void
	onClose?: () => void
}

type modeType = 'icon' | 'path' | 'code'

const IconSelector = (props: IconSelectorProps) => {
	const [show, setShow] = useState(props.show ?? true)
	const [icon, setIcon] = useState<IconType | TablerIdType | null>(props.icon || null)
	const [mode, setMode] = useState<modeType>('icon')

	useEffect(() => {
		setIcon(props.icon || null)
		if (!props.icon) return
		if ('icon' in props.icon) return setMode('icon')
		if ('asset' in props.icon) return setMode('path')
		if ('code' in props.icon) return setMode('code')
	}, [props.icon])

	useEffect(() => {
		if (mode === 'icon') {
			if (!icon || !('icon' in icon)) {
				setIcon({ label: '', description: '', id: '', icon: () => null } as IconDataType)
			}
		}

		// else if (mode === 'path') {
		// 	if (!icon || !('asset' in icon)) {
		// 		setIcon({ label: '', description: '', asset: null } as IconAssetType)
		// 	}
		// }
		else if (mode === 'code') {
			let code = ''
			if (!icon) {
			} else if ('code' in icon) {
				code = icon.code
			} else if ('element' in icon) {
			}
			setIcon({ label: '', description: '', code } as any)
		}
	}, [mode])

	const saveIcon = () => {
		props.onSave?.(icon)
		close()
	}

	const close = () => {
		props.onClose?.()
		setShow(false)
	}

	/////////////////
	/// RENDERING ///
	/////////////////
	// #region Rendering

	const ModeOptionsEl = useMemo(() => {
		return (
			<div id='mode-options'>
				<Icon
					name='health-recognition'
					title='Select an icon.'
					className={mode === 'icon' ? 'active' : ''}
					onClick={() => setMode('icon')}
					size={30}
				/>
				<Icon
					name='polaroid'
					title='Add a path to an image file.'
					className={mode === 'path' ? 'active' : ''}
					onClick={() => setMode('path')}
					size={30}
				/>
				<Icon
					name='source-code'
					title='Add HTML or SVG code directly.'
					className={mode === 'code' ? 'active' : ''}
					onClick={() => setMode('code')}
					size={30}
				/>
			</div>
		)
	}, [mode])

	const tablerIconModeEl = useMemo(() => {
		const id = props.icon && 'id' in props.icon ? props.icon.id : null

		return (
			mode === 'icon' && (
				<div id='tabler-icon-mode' className='icon-mode'>
					<h3>Select an Icon</h3>

					<IconGrid selectId={id} onSelect={setIcon} />
				</div>
			)
		)
	}, [mode, props.icon])

	// const assetPathModeEl = useMemo(() => {
	// 	const asset = props.icon && 'asset' in props.icon ? props.icon.asset : null

	// 	return mode === 'path' && (
	// 		<div id='asset-path-mode' className='icon-mode'>
	// 			<h3>Select an Image Path</h3>

	// 			<AssetSelector
	// 				path={asset?.path}
	// 				accept={'image'}
	// 				onSelect={(newAsset: AssetType) => {
	// 					setIcon({
	// 						label: asset?.name || '',
	// 						description: 'Icon from image asset',
	// 						asset: newAsset
	// 					} as IconAssetType)
	// 				}}
	// 			/>
	// 		</div>
	// 	)
	// }, [mode, props.icon])

	const sourceCodeModeEl = useMemo(() => {
		const code = props.icon && 'code' in props.icon ? props.icon.code : ''

		return (
			mode === 'code' && (
				<div id='source-code-mode' className='icon-mode'>
					<h3>Add HTML or SVG Code</h3>

					<Icon className='code-icon-preview' data={icon && 'icon' in icon ? icon : undefined} size={24} />

					<CodeInput
						code={code}
						onChange={(newCode) => {
							setIcon({
								label: '',
								description: 'Icon from source code',
								code: newCode
							} as any)
						}}
					/>
				</div>
			)
		)
	}, [mode, icon, props.icon])

	const actionButtonsEl = useMemo(() => {
		return (
			<div className='actions'>
				<Icon
					name='square-rounded-check'
					className='save-button'
					title='Save Changes'
					onClick={saveIcon}
					fgColor='var(--color-shadow, redsecondary)'
					size={30}
				/>
				<Icon
					name='square-rounded-x'
					className='cancel-button'
					title='Cancel'
					onClick={close}
					fgColor='var(--color-shadow, redoutline)'
					size={30}
				/>
			</div>
		)
	}, [saveIcon, close])

	return (
		show && (
			<div id='icon-selector'>
				<h2>Select Icon</h2>

				<div id='select-icon-body'>
					{ModeOptionsEl}

					{/* One of these */}
					{tablerIconModeEl}
					{/* {assetPathModeEl} */}
					{sourceCodeModeEl}
				</div>

				{actionButtonsEl}
			</div>
		)
	)
}

export type { IconSelectorProps }
export default IconSelector
