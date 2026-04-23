"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { mainCharacterAssets, npcAssets, pokemonPalette, type PortfolioAsset } from "@/lib/asset-catalog";
import {
	type LibrarySelection,
	type SheetPreviewConfig,
	SHEET_PREVIEW_CONFIGS,
	getAdjacentSpriteLibrarySelection,
	getSheetPreviewConfig,
	spriteLibraryAssets,
} from "./sprite-library-data";

function LibrarySection({
	body,
	eyebrow,
	title,
}: {
	body: string;
	eyebrow: string;
	title: string;
}) {
	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
			<div className="max-w-3xl">
				<p className="pixel-eyebrow">{eyebrow}</p>
				<h3 className="m-0 font-dot-gothic text-2xl leading-tight sm:text-3xl">
					{title}
				</h3>
			</div>
			<p className="m-0 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
				{body}
			</p>
		</div>
	);
}

function AnimatedSpritePreview({
	asset,
	config,
	maxFrameSize = 148,
	mode,
}: {
	asset: PortfolioAsset;
	config: SheetPreviewConfig;
	maxFrameSize?: number;
	mode: SheetPreviewConfig["modes"][number];
}) {
	const frameWidth = asset.width / config.columns;
	const frameHeight = asset.height / config.rows;
	const scale = Math.min(1.8, maxFrameSize / frameWidth, maxFrameSize / frameHeight);
	const baseX = (mode.column ?? 0) * frameWidth * scale;
	const baseY = (mode.row ?? 0) * frameHeight * scale;
	const style = {
		"--sprite-base-x": `${baseX}px`,
		"--sprite-base-y": `${baseY}px`,
		"--sprite-sheet-travel": `${frameWidth * config.columns * scale}px`,
		"--sprite-sheet-steps": `${config.columns}`,
		"--sprite-sheet-duration": `${(config.frameDurationMs ?? 160) * config.columns}ms`,
		"--sprite-sheet-iteration": config.animateColumns ? "infinite" : "1",
		backgroundImage: `url(${asset.src})`,
		backgroundSize: `${asset.width * scale}px ${asset.height * scale}px`,
		width: `${frameWidth * scale}px`,
		height: `${frameHeight * scale}px`,
	} as CSSProperties;

	return (
		<div
			className={`sprite-sheet-preview ${
				config.animateColumns ? "" : "sprite-sheet-preview--static"
			}`}
			style={style}
			aria-hidden="true"
		/>
	);
}

function FullscreenSpriteViewer({
	isNightTheme,
	onClose,
	onModeChange,
	onSelectionStep,
	selection,
}: {
	isNightTheme: boolean;
	onClose: () => void;
	onModeChange: (modeIndex: number) => void;
	onSelectionStep: (direction: 1 | -1) => void;
	selection: LibrarySelection;
}) {
	const config = getSheetPreviewConfig(selection.asset);
	const hasModeNavigation = Boolean(config && config.modes.length > 1);
	const activeMode = config?.modes[selection.modeIndex] ?? null;
	const assetIndex = Math.max(
		0,
		spriteLibraryAssets.findIndex((asset) => asset.src === selection.asset.src),
	);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			switch (event.key) {
				case "ArrowLeft":
					event.preventDefault();
					if (hasModeNavigation && config) {
						onModeChange(
							(selection.modeIndex - 1 + config.modes.length) % config.modes.length,
						);
						return;
					}
					onSelectionStep(-1);
					return;
				case "ArrowRight":
					event.preventDefault();
					if (hasModeNavigation && config) {
						onModeChange((selection.modeIndex + 1) % config.modes.length);
						return;
					}
					onSelectionStep(1);
					return;
				case "ArrowUp":
				case "PageUp":
					event.preventDefault();
					onSelectionStep(-1);
					return;
				case "ArrowDown":
				case "PageDown":
					event.preventDefault();
					onSelectionStep(1);
					return;
				case "Home":
					if (hasModeNavigation && config) {
						event.preventDefault();
						onModeChange(0);
					}
					return;
				case "End":
					if (hasModeNavigation && config) {
						event.preventDefault();
						onModeChange(config.modes.length - 1);
					}
					return;
				default:
					return;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [config, hasModeNavigation, onModeChange, onSelectionStep, selection.modeIndex]);

	return (
		<div
			className="fixed inset-0 z-30 grid place-items-center bg-black/72 p-4 backdrop-blur-md sm:p-6"
			role="presentation"
			onClick={onClose}
		>
			<section
				className={`pokedex-box fullscreen-sprite-viewer flex w-[min(1280px,calc(100vw-1rem))] max-h-[min(calc(100dvh-1rem),940px)] flex-col gap-5 overflow-hidden p-5 sm:p-8 ${isNightTheme ? "night-ui" : ""}`}
				role="dialog"
				aria-modal="true"
				aria-labelledby="fullscreen-sprite-title"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="fullscreen-sprite-viewer__layout">
					<div className="fullscreen-sprite-viewer__sidebar">
						<div className="flex flex-col gap-4 border-b border-line/10 pb-5">
							<div className="flex items-start justify-between gap-4">
								<div>
									<p className="pixel-eyebrow">{selection.asset.tag}</p>
									<h3
										className="m-0 font-dot-gothic text-2xl leading-tight sm:text-3xl"
										id="fullscreen-sprite-title"
									>
										{selection.asset.title}
									</h3>
								</div>
								<button
									type="button"
									className="pixel-button px-4 py-2 text-sm"
									onClick={onClose}
								>
									Close
								</button>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div className="pixel-card bg-white/75 p-3">
									<p className="pixel-eyebrow">Sheet Size</p>
									<strong className="block text-base sm:text-lg">
										{selection.asset.width}x{selection.asset.height}
									</strong>
								</div>
								<div className="pixel-card bg-white/75 p-3">
									<p className="pixel-eyebrow">Library Slot</p>
									<strong className="block text-base sm:text-lg">
										{assetIndex + 1}/{spriteLibraryAssets.length}
									</strong>
								</div>
							</div>
						</div>

						{config ? (
							<div className="flex flex-col gap-3">
								<p className="pixel-eyebrow">Modes</p>
								<div className="flex flex-wrap gap-2">
									{config.modes.map((mode, index) => (
										<button
											type="button"
											className={`sprite-mode-chip ${index === selection.modeIndex ? "sprite-mode-chip--active" : ""}`}
											key={`${selection.asset.src}:viewer:${mode.label}`}
											onClick={() => onModeChange(index)}
										>
											{mode.label}
										</button>
									))}
								</div>
							</div>
						) : null}

						<div className="flex flex-col gap-3">
							<p className="pixel-eyebrow">Browse</p>
							<div className="grid grid-cols-2 gap-3">
								<button
									type="button"
									className="pixel-button px-4 py-2 text-sm"
									onClick={() => onSelectionStep(-1)}
								>
									Previous
								</button>
								<button
									type="button"
									className="pixel-button px-4 py-2 text-sm"
									onClick={() => onSelectionStep(1)}
								>
									Next
								</button>
							</div>
						</div>

						<div className="fullscreen-sprite-viewer__hintbar">
							<span>Esc back to library</span>
							<span>
								{hasModeNavigation
									? "←/→ switch mode"
									: "←/→ switch item"}
							</span>
							<span>&uarr;/&darr; switch item</span>
						</div>
					</div>

					<div className="fullscreen-sprite-viewer__main">
						<div className="fullscreen-sprite-viewer__stage">
							{config && activeMode ? (
								<AnimatedSpritePreview
									asset={selection.asset}
									config={config}
									maxFrameSize={360}
									mode={activeMode}
								/>
							) : (
								<Image
									src={selection.asset.src}
									alt={selection.asset.title}
									width={selection.asset.width}
									height={selection.asset.height}
									className="fullscreen-sprite-viewer__image"
									sizes="100vw"
								/>
							)}
						</div>
						<p className="fullscreen-sprite-viewer__caption">
							Pixel-perfect preview with persistent mode selection and keyboard
							navigation.
						</p>
					</div>
				</div>
			</section>
		</div>
	);
}

function SpriteCard({
	asset,
	onOpen,
}: {
	asset: PortfolioAsset;
	onOpen: (selection: LibrarySelection) => void;
}) {
	const config = getSheetPreviewConfig(asset);
	const [modeIndex, setModeIndex] = useState(0);
	const activeMode = config?.modes[modeIndex] ?? null;

	return (
		<article
			className="pixel-card sprite-library-card flex cursor-zoom-in flex-col gap-4 p-4"
			role="button"
			tabIndex={0}
			onClick={() => onOpen({ asset, modeIndex })}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onOpen({ asset, modeIndex });
				}
			}}
		>
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="pixel-eyebrow">{asset.tag}</p>
					<strong className="block text-lg leading-tight">{asset.title}</strong>
				</div>
				<span className="font-dot-gothic text-[10px] uppercase tracking-wider text-ink-soft">
					{asset.width}x{asset.height}
				</span>
			</div>
			{config && config.modes.length > 1 ? (
				<div className="flex flex-wrap gap-2">
					{config.modes.map((mode, index) => (
						<button
							type="button"
							className={`sprite-mode-chip ${index === modeIndex ? "sprite-mode-chip--active" : ""}`}
							key={`${asset.src}:${mode.label}`}
							onClick={(event) => {
								event.stopPropagation();
								setModeIndex(index);
							}}
						>
							{mode.label}
						</button>
					))}
				</div>
			) : null}
			<div className="sprite-library-stage">
				{config && activeMode ? (
					<AnimatedSpritePreview asset={asset} config={config} mode={activeMode} />
				) : (
					<Image
						src={asset.src}
						alt={asset.title}
						width={asset.width}
						height={asset.height}
						className="sprite-library-stage__image"
						sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 25vw"
					/>
				)}
			</div>
		</article>
	);
}

function PaletteSwatchCard({
	hex,
	name,
}: {
	hex: string;
	name: string;
}) {
	return (
		<div className="pixel-card palette-swatch-card flex items-center gap-4 p-3 sm:p-4">
			<div
				className="palette-swatch-chip h-14 w-14 shrink-0 sm:h-16 sm:w-16"
				style={{ backgroundColor: hex }}
				aria-hidden="true"
			/>
			<div className="min-w-0">
				<p className="pixel-eyebrow">{name}</p>
				<strong className="block font-dot-gothic text-xl leading-tight sm:text-2xl">
					{hex}
				</strong>
			</div>
		</div>
	);
}

export function SpriteLibraryPanel({
	isNightTheme,
	onSelectionChange,
	selection,
}: {
	isNightTheme: boolean;
	onSelectionChange: (selection: LibrarySelection | null) => void;
	selection: LibrarySelection | null;
}) {
	const motionAssets = mainCharacterAssets.filter(
		(asset) => asset.tag === "Sheet" || asset.tag === "Gesture",
	);
	const poseAssets = mainCharacterAssets.filter(
		(asset) => !motionAssets.some((entry) => entry.src === asset.src),
	);

	return (
		<div className="flex flex-col gap-6">
			<section className="pixel-card library-panel-hero relative overflow-hidden p-5 sm:p-8">
				<div className="relative z-10 flex flex-col gap-6">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<p className="pixel-eyebrow">Sprite Library</p>
						<span className="pixel-chip px-3 py-1 font-dot-gothic text-xs lowercase shadow-none!">
							{mainCharacterAssets.length + npcAssets.length} character files
						</span>
					</div>
					<div className="flex flex-col gap-4">
						<h2 className="m-0 max-w-4xl font-dot-gothic text-3xl leading-tight sm:text-4xl">
							Full sprite shelf and palette board
						</h2>
						<p className="m-0 max-w-4xl text-lg leading-relaxed sm:text-2xl">
							Every playable character sheet, pose, NPC strip, and the shared
							color language now sits in one library instead of being scattered
							across hidden annex rooms.
						</p>
					</div>
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
						<div className="pixel-card bg-white/75 p-4">
							<p className="pixel-eyebrow">Main Pack</p>
							<strong className="text-lg sm:text-xl">
								{mainCharacterAssets.length}
							</strong>
						</div>
						<div className="pixel-card bg-white/75 p-4">
							<p className="pixel-eyebrow">NPC Pack</p>
							<strong className="text-lg sm:text-xl">{npcAssets.length}</strong>
						</div>
						<div className="pixel-card bg-white/75 p-4">
							<p className="pixel-eyebrow">Palette</p>
							<strong className="text-lg sm:text-xl">
								{pokemonPalette.length} swatches
							</strong>
						</div>
						<div className="pixel-card bg-white/75 p-4">
							<p className="pixel-eyebrow">Style</p>
							<strong className="text-lg sm:text-xl">GBA pop</strong>
						</div>
					</div>
					<div className="flex flex-col gap-3">
						<div className="flex items-center justify-between gap-4">
							<p className="pixel-eyebrow">Quick Preview</p>
							<span className="font-dot-gothic text-[10px] uppercase tracking-[0.18em] text-ink-soft">
								Top motion sheets
							</span>
						</div>
						<div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
							{motionAssets.slice(0, 4).map((asset) => (
								<div
									className="pixel-card sprite-library-card cursor-zoom-in p-3"
									key={asset.src}
									role="button"
									tabIndex={0}
									onClick={() => onSelectionChange({ asset, modeIndex: 0 })}
									onKeyDown={(event) => {
										if (event.key === "Enter" || event.key === " ") {
											event.preventDefault();
											onSelectionChange({ asset, modeIndex: 0 });
										}
									}}
								>
									<div className="mb-3 flex items-center justify-between gap-2">
										<span className="asset-chip">{asset.tag}</span>
										<span className="font-dot-gothic text-[10px] uppercase tracking-wider text-white/80">
											preview
										</span>
									</div>
									<div className="sprite-library-stage sprite-library-stage--compact">
										<AnimatedSpritePreview
											asset={asset}
											config={SHEET_PREVIEW_CONFIGS[asset.title]!}
											mode={SHEET_PREVIEW_CONFIGS[asset.title]!.modes[0]}
										/>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			<section className="pixel-card flex flex-col gap-6 bg-panel-strong/65 p-5 sm:p-8">
				<LibrarySection
					eyebrow="Color Board"
					title="Shared palette system"
					body="This is the exact site palette now driving the chrome, panels, accents, and sprite-library framing. `#F8F8F8` replaces pure white so the UI stays softer on bright displays."
				/>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{pokemonPalette.map((swatch) => (
						<PaletteSwatchCard key={swatch.hex} {...swatch} />
					))}
				</div>
			</section>

			<section className="pixel-card flex flex-col gap-6 bg-panel-strong/65 p-5 sm:p-8">
				<LibrarySection
					eyebrow="Hero Motion"
					title="Main character animations"
					body="Walking, biking, swimming, surfing, and gesture sheets are shown with live cycling previews, while the portrait and pose assets stay visible in the same room."
				/>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
					{motionAssets.map((asset) => (
						<SpriteCard
							asset={asset}
							key={asset.src}
							onOpen={onSelectionChange}
						/>
					))}
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
					{poseAssets.map((asset) => (
						<SpriteCard
							asset={asset}
							key={asset.src}
							onOpen={onSelectionChange}
						/>
					))}
				</div>
			</section>

			<section className="pixel-card flex flex-col gap-6 bg-panel-strong/65 p-5 sm:p-8">
				<LibrarySection
					eyebrow="Town Cast"
					title="NPC and creature sheets"
					body="The active residents and creature strips are grouped as a proper cast sheet, with animated previews for the motion-based sprite sheets."
				/>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
					{npcAssets.map((asset) => (
						<SpriteCard
							asset={asset}
							key={asset.src}
							onOpen={onSelectionChange}
						/>
					))}
				</div>
			</section>

			{selection ? (
			<FullscreenSpriteViewer
				isNightTheme={isNightTheme}
				selection={selection}
				onClose={() => onSelectionChange(null)}
					onModeChange={(modeIndex) =>
						onSelectionChange({ ...selection, modeIndex })
					}
					onSelectionStep={(direction) =>
						onSelectionChange(
							getAdjacentSpriteLibrarySelection(selection, direction),
						)
					}
				/>
			) : null}
		</div>
	);
}
