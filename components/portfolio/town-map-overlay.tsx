"use client";

import type { MouseEvent as ReactMouseEvent, RefObject } from "react";
import { emoteAssets, mainCharacterAssets, npcAssets } from "@/lib/asset-catalog";
import type { Position, StopId, TownStop } from "@/lib/portfolio-content";
import type {
	DevInteractionMode,
	DevLayerVisibility,
	DevMapDrafts,
	DevPolygonKind,
	DevToolMode,
} from "./map-dev-tool";
import type { DragTarget } from "./town-map-utils";
import { clamp, isPolygonMode, pointsToPolygon } from "./town-map-utils";

function getTooltipFrame(
	outlineBounds: { x: number; y: number; width: number; height: number },
	label: string,
	mapHeight: number,
	mapWidth: number,
	showKeyboardHint: boolean,
) {
	const width = clamp(Math.round(label.length * 11.2 + 22), 88, 240);
	const height = 34;
	const hintAllowance = showKeyboardHint ? 18 : 0;
	const centerX = outlineBounds.x + outlineBounds.width / 2;
	const x = clamp(centerX - width / 2, 10, mapWidth - width - 10);
	const y = clamp(
		outlineBounds.y + 12,
		10,
		mapHeight - height - hintAllowance - 10,
	);

	return { x, y, width, height };
}

function getOutlineBounds(points: Position[]) {
	const xs = points.map((point) => point.x);
	const ys = points.map((point) => point.y);
	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minY = Math.min(...ys);
	const maxY = Math.max(...ys);
	const padding = 8;

	return {
		x: minX - padding,
		y: minY - padding,
		width: maxX - minX + padding * 2,
		height: maxY - minY + padding * 2,
	};
}

function isRenderablePoint(point: Position) {
	return point.x >= 0 && point.y >= 0;
}

const TRAINER_SPRITE_PATH = "/assets/characters/main/move.png";
const TRAINER_SPRITE_RENDER_SIZE = 32;
const TRAINER_SPRITE_CLIP_ID = "town-trainer-sprite-clip";
const SPARKLE_EFFECT_PATH = "/assets/effects/sparkle.png";
const STATIC_AMBIENT_SPRITE_IDS = new Set([
	"bench-sitter",
	"parked-bike",
	"fountain-wave",
]);

export type FacingDirection = "up" | "down" | "left" | "right";

export type AmbientSpriteDefinition = {
	id: string;
	src: string;
	x: number;
	y: number;
	columns: number;
	rows: number;
	renderWidth: number;
	renderHeight: number;
	row?: number;
	column?: number;
	animateAxis?: "column" | "row";
	animationFrames?: number;
	animationOffset?: number;
	defaultEmoteVisible?: boolean;
	shadow?: boolean;
	emote?: {
		src: string;
		x: number;
		y: number;
		columns: number;
		rows: number;
		renderWidth: number;
		renderHeight: number;
		animateAxis?: "column" | "row";
		animationFrames?: number;
		animationOffset?: number;
	};
};

export type AmbientSpriteActor = AmbientSpriteDefinition & {
	emoteAnimationMs: number;
	emoteVisible: boolean;
	facing: FacingDirection;
	idleRemainingMs: number;
	moving: boolean;
	position: Position;
	spawn: Position;
	speed: number;
	target: Position | null;
};

export const OVERWORLD_AMBIENT_SPRITES: AmbientSpriteDefinition[] = [
	{
		id: "npc-1-north",
		src: npcAssets[5].src,
		x: 462,
		y: 334,
		columns: 4,
		rows: 4,
		renderWidth: 32,
		renderHeight: 32,
		row: 0,
		animateAxis: "column",
		animationFrames: 4,
		shadow: true,
		emote: {
			src: emoteAssets[8].src,
			x: 7,
			y: -20,
			columns: 1,
			rows: 5,
			renderWidth: 18,
			renderHeight: 18,
			animateAxis: "row",
			animationFrames: 5,
		},
	},
	{
		id: "npc-2-north",
		src: npcAssets[6].src,
		x: 500,
		y: 336,
		columns: 4,
		rows: 4,
		renderWidth: 32,
		renderHeight: 32,
		row: 1,
		animateAxis: "column",
		animationFrames: 4,
		animationOffset: 1,
		shadow: true,
		emote: {
			src: emoteAssets[11].src,
			x: 8,
			y: -19,
			columns: 1,
			rows: 5,
			renderWidth: 18,
			renderHeight: 18,
			animateAxis: "row",
			animationFrames: 5,
			animationOffset: 1,
		},
	},
	{
		id: "npc-3-center",
		src: npcAssets[7].src,
		x: 552,
		y: 334,
		columns: 4,
		rows: 4,
		renderWidth: 32,
		renderHeight: 32,
		row: 0,
		shadow: true,
		emote: {
			src: emoteAssets[9].src,
			x: 8,
			y: -18,
			columns: 1,
			rows: 5,
			renderWidth: 18,
			renderHeight: 18,
			animateAxis: "row",
			animationFrames: 5,
			animationOffset: 2,
		},
	},
	{
		id: "npc-4-right",
		src: npcAssets[8].src,
		x: 594,
		y: 338,
		columns: 4,
		rows: 4,
		renderWidth: 32,
		renderHeight: 32,
		row: 3,
		shadow: true,
		emote: {
			src: emoteAssets[13].src,
			x: 7,
			y: -19,
			columns: 1,
			rows: 5,
			renderWidth: 18,
			renderHeight: 18,
			animateAxis: "row",
			animationFrames: 5,
			animationOffset: 3,
		},
	},
	{
		id: "npc-5-fountain",
		src: npcAssets[9].src,
		x: 160,
		y: 512,
		columns: 4,
		rows: 4,
		renderWidth: 32,
		renderHeight: 32,
		row: 3,
		animateAxis: "column",
		animationFrames: 4,
		animationOffset: 2,
		shadow: true,
		emote: {
			src: emoteAssets[12].src,
			x: 7,
			y: -20,
			columns: 1,
			rows: 5,
			renderWidth: 18,
			renderHeight: 18,
			animateAxis: "row",
			animationFrames: 5,
		},
	},
	{
		id: "snpc-1-fountain",
		src: npcAssets[10].src,
		x: 280,
		y: 502,
		columns: 4,
		rows: 4,
		renderWidth: 32,
		renderHeight: 32,
		row: 1,
		shadow: true,
		emote: {
			src: emoteAssets[1].src,
			x: 8,
			y: -20,
			columns: 1,
			rows: 5,
			renderWidth: 18,
			renderHeight: 18,
			animateAxis: "row",
			animationFrames: 5,
			animationOffset: 4,
		},
	},
	{
		id: "snpc-2-house",
		src: npcAssets[11].src,
		x: 672,
		y: 349,
		columns: 3,
		rows: 4,
		renderWidth: 24,
		renderHeight: 32,
		row: 0,
		animateAxis: "column",
		animationFrames: 3,
		animationOffset: 1,
		shadow: true,
		emote: {
			src: emoteAssets[3].src,
			x: 3,
			y: -20,
			columns: 1,
			rows: 5,
			renderWidth: 18,
			renderHeight: 18,
			animateAxis: "row",
			animationFrames: 5,
			animationOffset: 2,
		},
	},
	{
		id: "creature-1-construction",
		src: npcAssets[0].src,
		x: 760,
		y: 620,
		columns: 2,
		rows: 4,
		renderWidth: 26,
		renderHeight: 32,
		row: 1,
		animateAxis: "column",
		animationFrames: 2,
		shadow: true,
	},
	{
		id: "creature-2-fountain",
		src: npcAssets[1].src,
		x: 242,
		y: 689,
		columns: 2,
		rows: 4,
		renderWidth: 26,
		renderHeight: 32,
		row: 0,
		animateAxis: "column",
		animationFrames: 2,
		animationOffset: 1,
		shadow: true,
	},
	{
		id: "creature-3-garden",
		src: npcAssets[2].src,
		x: 854,
		y: 803,
		columns: 2,
		rows: 4,
		renderWidth: 26,
		renderHeight: 32,
		row: 3,
		shadow: true,
	},
	{
		id: "creature-4-route",
		src: npcAssets[3].src,
		x: 666,
		y: 767,
		columns: 2,
		rows: 4,
		renderWidth: 26,
		renderHeight: 32,
		row: 1,
		animateAxis: "column",
		animationFrames: 2,
		shadow: true,
	},
	{
		id: "creature-5-south",
		src: npcAssets[4].src,
		x: 421,
		y: 841,
		columns: 2,
		rows: 4,
		renderWidth: 26,
		renderHeight: 32,
		row: 0,
		animateAxis: "column",
		animationFrames: 2,
		animationOffset: 1,
		shadow: true,
	},
	{
		id: "bench-sitter",
		src: mainCharacterAssets[10].src,
		x: 246,
		y: 515,
		columns: 1,
		rows: 4,
		renderWidth: 24,
		renderHeight: 32,
		row: 0,
		shadow: true,
	},
	{
		id: "parked-bike",
		src: mainCharacterAssets[0].src,
		x: 647,
		y: 360,
		columns: 1,
		rows: 4,
		renderWidth: 18,
		renderHeight: 32,
		row: 1,
		shadow: true,
	},
	{
		id: "fountain-wave",
		src: mainCharacterAssets[14].src,
		x: 276,
		y: 696,
		columns: 2,
		rows: 1,
		renderWidth: 32,
		renderHeight: 16,
		row: 0,
		animateAxis: "column",
		animationFrames: 2,
		emote: {
			src: SPARKLE_EFFECT_PATH,
			x: 6,
			y: -14,
			columns: 1,
			rows: 6,
			renderWidth: 16,
			renderHeight: 16,
			animateAxis: "row",
			animationFrames: 6,
			animationOffset: 2,
		},
	},
];

function getTrainerSpriteRow(facing: FacingDirection) {
	if (facing === "down") {
		return 0;
	}

	if (facing === "left") {
		return 1;
	}

	if (facing === "up") {
		return 2;
	}

	return 3;
}

function getAnimatedCell({
	animateAxis,
	animationFrames,
	animationOffset = 0,
	baseColumn = 0,
	baseRow = 0,
	spriteTick,
}: {
	animateAxis?: "column" | "row";
	animationFrames?: number;
	animationOffset?: number;
	baseColumn?: number;
	baseRow?: number;
	spriteTick: number;
}) {
	if (!animateAxis || !animationFrames || animationFrames < 2) {
		return {
			column: baseColumn,
			row: baseRow,
		};
	}

	if (animateAxis === "row") {
		const peakFrame =
			animationFrames >= 4
				? animationFrames - 2
				: Math.floor((animationFrames - 1) / 2);
		const settleFrame = Math.min(animationFrames - 1, peakFrame + 1);
		const rowSequence = [
			...Array.from({ length: peakFrame + 1 }, (_, index) => index),
			...Array.from({ length: 4 }, () => peakFrame),
			...Array.from(
				{ length: settleFrame > peakFrame ? 2 : 0 },
				() => settleFrame,
			),
		];
		const animatedFrame =
			rowSequence[(spriteTick + animationOffset) % rowSequence.length] ?? peakFrame;

		return {
			column: baseColumn,
			row: animatedFrame,
		};
	}

	const animatedFrame = (spriteTick + animationOffset) % animationFrames;

	return {
		column: animatedFrame,
		row: baseRow,
	};
}

function getOneShotRowCell({
	animationFrames,
	baseColumn = 0,
	baseRow = 0,
	progressMs,
}: {
	animationFrames?: number;
	baseColumn?: number;
	baseRow?: number;
	progressMs: number;
}) {
	if (!animationFrames || animationFrames < 2) {
		return {
			column: baseColumn,
			row: baseRow,
		};
	}

	const peakFrame =
		animationFrames >= 4
			? animationFrames - 2
			: Math.floor((animationFrames - 1) / 2);
	const settleFrame = Math.min(animationFrames - 1, peakFrame + 1);
	const rowSequence = [
		...Array.from({ length: peakFrame + 1 }, (_, index) => index),
		...Array.from({ length: 4 }, () => peakFrame),
		...Array.from(
			{ length: settleFrame > peakFrame ? 2 : 0 },
			() => settleFrame,
		),
	];
	const frameDurationMs = 120;
	const sequenceIndex = Math.min(
		Math.floor(progressMs / frameDurationMs),
		rowSequence.length - 1,
	);
	const animatedFrame = rowSequence[sequenceIndex] ?? peakFrame;

	return {
		column: baseColumn,
		row: animatedFrame,
	};
}

export function TownMapOverlay({
	activeDraftPoints,
	activePolygonKind,
	activeStopId,
	ambientSprites,
	characterVisible,
	devDrafts,
	devInteractionMode,
	devMode,
	devRegionId,
	devSelectedStopId,
	effectiveLayerVisibility,
	facing,
	focusStopId,
	isDev,
	mapHeight,
	mapWidth,
	onDragTargetChange,
	onEnterStop,
	onHoverChange,
	onSurfaceClick,
	showCaptureOnly,
	showPointHandles,
	stops,
	svgRef,
	trainerFrame,
	trainerMoving,
	trainerTransform,
	visibleStopId,
	worldSpriteTick,
}: {
	activeDraftPoints: Position[];
	activePolygonKind: DevPolygonKind | null;
	activeStopId: StopId | null;
	ambientSprites: AmbientSpriteActor[];
	characterVisible: boolean;
	devDrafts: DevMapDrafts;
	devInteractionMode: DevInteractionMode;
	devMode: DevToolMode;
	devRegionId: string;
	devSelectedStopId: StopId;
	effectiveLayerVisibility: DevLayerVisibility;
	facing: "up" | "down" | "left" | "right";
	focusStopId: StopId | null;
	isDev: boolean;
	mapHeight: number;
	mapWidth: number;
	onDragTargetChange: (target: DragTarget | null) => void;
	onEnterStop: (stopId: StopId) => void;
	onHoverChange: (stopId: StopId | null) => void;
	onSurfaceClick: (event: ReactMouseEvent<SVGSVGElement>) => void;
	showCaptureOnly: boolean;
	showPointHandles: boolean;
	stops: TownStop[];
	svgRef: RefObject<SVGSVGElement | null>;
	trainerFrame: number;
	trainerMoving: boolean;
	trainerTransform: string;
	visibleStopId: StopId | null;
	worldSpriteTick: number;
}) {
	const activePolygonPoints =
		activePolygonKind === "walkable" ||
		activePolygonKind === "blocked" ||
		activePolygonKind === "section"
			? devDrafts.polygons.filter((entry) => entry.kind === activePolygonKind)
			: [];
	const visiblePolygonHandles =
		activePolygonKind === null
			? []
			: activePolygonPoints.filter((entry) => entry.id === devRegionId);
	const showStopTooltip = !isDev || devInteractionMode === "view";
	const trainerSpriteRow = getTrainerSpriteRow(facing);
	const trainerSpriteColumn = trainerMoving ? trainerFrame : 0;
	const sortedAmbientSprites = [...ambientSprites].sort(
		(first, second) =>
			first.position.y + first.renderHeight - (second.position.y + second.renderHeight),
	);

	return (
		<svg
			ref={svgRef}
			className="map-overlay"
			viewBox={`0 0 ${mapWidth} ${mapHeight}`}
			preserveAspectRatio="xMidYMid slice"
			onClick={onSurfaceClick}
			role="img"
			aria-label="Pokemon-inspired portfolio town map"
		>
			<defs>
				<clipPath id={TRAINER_SPRITE_CLIP_ID}>
					<rect
						x="0"
						y="0"
						width={TRAINER_SPRITE_RENDER_SIZE}
						height={TRAINER_SPRITE_RENDER_SIZE}
					/>
				</clipPath>
				{sortedAmbientSprites.map((sprite) => (
					<clipPath id={`ambient-${sprite.id}-clip`} key={`clip-${sprite.id}`}>
						<rect
							x={sprite.position.x}
							y={sprite.position.y}
							width={sprite.renderWidth}
							height={sprite.renderHeight}
						/>
					</clipPath>
				))}
				{sortedAmbientSprites
					.filter((sprite) => sprite.emote)
					.map((sprite) => (
						<clipPath
							id={`ambient-${sprite.id}-emote-clip`}
							key={`clip-emote-${sprite.id}`}
						>
							<rect
								x={sprite.position.x + sprite.emote!.x}
								y={sprite.position.y + sprite.emote!.y}
								width={sprite.emote!.renderWidth}
								height={sprite.emote!.renderHeight}
							/>
						</clipPath>
					))}
			</defs>

			{isDev ? (
				<g className="walk-debug">
					{effectiveLayerVisibility.walkable
						? devDrafts.polygons
								.filter((entry) => entry.kind === "walkable" && entry.points.length >= 3)
								.map((entry) => (
									<polygon
										key={`walk-${entry.id}`}
										className={`walkable-debug ${
											activePolygonKind === "walkable" && entry.id === devRegionId
												? "is-active"
												: ""
										}`}
										points={pointsToPolygon(entry.points)}
									/>
								))
						: null}
					{effectiveLayerVisibility.sections
						? devDrafts.polygons
								.filter((entry) => entry.kind === "section" && entry.points.length >= 3)
								.map((entry) => (
									<polygon
										key={`section-${entry.id}`}
										className={`section-debug ${
											activePolygonKind === "section" && entry.id === devRegionId
												? "is-active"
												: ""
										}`}
										points={pointsToPolygon(entry.points)}
									/>
								))
						: null}
					{effectiveLayerVisibility.blocked
						? devDrafts.polygons
								.filter((entry) => entry.kind === "blocked" && entry.points.length >= 3)
								.map((entry) => (
									<polygon
										key={`blocked-${entry.id}`}
										className={`blocked-debug ${
											activePolygonKind === "blocked" && entry.id === devRegionId
												? "is-active"
												: ""
										}`}
										points={pointsToPolygon(entry.points)}
									/>
								))
						: null}

					{activeDraftPoints.length >= 2 ? (
						<polyline
							className="active-draft-line"
							points={pointsToPolygon(activeDraftPoints)}
						/>
					) : null}

					{showPointHandles
						? visiblePolygonHandles.map((entry) => (
								<g key={`points-${entry.kind}-${entry.id}`}>
									{entry.points.map((point, index) => (
										<g
											key={`${entry.kind}-${entry.id}-${point.x}-${point.y}-${index}`}
											className={`dev-point ${
												devInteractionMode === "move" ? "is-draggable" : ""
											}`}
											transform={`translate(${point.x} ${point.y})`}
											onPointerDown={(event) => {
												if (devInteractionMode !== "move") {
													return;
												}
												event.stopPropagation();
												onDragTargetChange({
													type: "polygon-point",
													kind: entry.kind,
													id: entry.id,
													index,
												});
											}}
										>
											<circle r="5" />
											<text x="9" y="4">
												{index + 1}
											</text>
										</g>
									))}
								</g>
							))
						: null}
				</g>
			) : null}

			{sortedAmbientSprites.length > 0 ? (
				<g className="ambient-sprite-layer" pointerEvents="none" aria-hidden="true">
					{sortedAmbientSprites.map((sprite) => {
						const spriteIsStatic = STATIC_AMBIENT_SPRITE_IDS.has(sprite.id);
						const spriteCell = getAnimatedCell({
							animateAxis:
								spriteIsStatic || sprite.moving ? sprite.animateAxis : undefined,
							animationFrames:
								spriteIsStatic || sprite.moving ? sprite.animationFrames : undefined,
							animationOffset: sprite.animationOffset,
							baseColumn: sprite.column,
							baseRow: spriteIsStatic
								? (sprite.row ?? 0)
								: getTrainerSpriteRow(sprite.facing),
							spriteTick: worldSpriteTick,
						});
						const emoteCell = sprite.emote
							? sprite.emote.animateAxis === "row"
								? getOneShotRowCell({
										animationFrames: sprite.emote.animationFrames,
										progressMs: sprite.emoteAnimationMs,
									})
								: getAnimatedCell({
										animateAxis: sprite.emote.animateAxis,
										animationFrames: sprite.emote.animationFrames,
										animationOffset: sprite.emote.animationOffset,
										spriteTick: Math.floor(worldSpriteTick / 3),
									})
							: null;

						return (
							<g className="ambient-sprite" key={sprite.id}>
								{sprite.shadow ? (
									<ellipse
										className="ambient-sprite__shadow"
										cx={sprite.position.x + sprite.renderWidth / 2}
										cy={sprite.position.y + sprite.renderHeight - 1}
										rx={Math.max(5, sprite.renderWidth * 0.26)}
										ry={Math.max(2.5, sprite.renderHeight * 0.09)}
									/>
								) : null}
								<g clipPath={`url(#ambient-${sprite.id}-clip)`}>
									<image
										className="ambient-sprite__sheet"
										href={sprite.src}
										x={
											sprite.position.x -
											spriteCell.column * sprite.renderWidth
										}
										y={
											sprite.position.y -
											spriteCell.row * sprite.renderHeight
										}
										width={sprite.renderWidth * sprite.columns}
										height={sprite.renderHeight * sprite.rows}
										preserveAspectRatio="none"
									/>
								</g>
								{sprite.emote && sprite.emoteVisible && emoteCell ? (
									<g clipPath={`url(#ambient-${sprite.id}-emote-clip)`}>
										<image
											className="ambient-sprite__effect"
											href={sprite.emote.src}
											x={
												sprite.position.x +
												sprite.emote.x -
												emoteCell.column * sprite.emote.renderWidth
											}
											y={
												sprite.position.y +
												sprite.emote.y -
												emoteCell.row * sprite.emote.renderHeight
											}
											width={sprite.emote.renderWidth * sprite.emote.columns}
											height={sprite.emote.renderHeight * sprite.emote.rows}
											preserveAspectRatio="none"
										/>
									</g>
								) : null}
							</g>
						);
					})}
				</g>
			) : null}

			{stops.map((stop) => {
				const draftStop = devDrafts.stops[stop.id];
				const outline = draftStop?.outline?.length ? draftStop.outline : stop.outline;
				const door = draftStop?.door ?? stop.door;
				const exit = draftStop?.exit ?? stop.exit;
				const infoAnchor = draftStop?.infoAnchor ?? stop.infoAnchor;
				const hasOutline = outline.length >= 3;
				const hasInfoAnchor = isRenderablePoint(infoAnchor);
				const hasDoor = isRenderablePoint(door);
				const hasExit = isRenderablePoint(exit);
				const isVisible = showStopTooltip && visibleStopId === stop.id;
				const isActive = activeStopId === stop.id;
				const isSelectedEditorStop =
					devMode !== "all" &&
					!isPolygonMode(devMode) &&
					stop.id === devSelectedStopId;
				const showSelectedStopOutline =
					isDev &&
					effectiveLayerVisibility.stopOutlines &&
					devMode !== "all" &&
					isSelectedEditorStop;
				const showSelectedStopAnchors =
					isDev &&
					isSelectedEditorStop &&
					(showPointHandles || effectiveLayerVisibility.stopAnchors);
				const hasVisibleEditorLayer =
					showSelectedStopAnchors &&
					((showPointHandles &&
						effectiveLayerVisibility.stopOutlines &&
						hasOutline) ||
						(effectiveLayerVisibility.stopAnchors &&
							!showCaptureOnly &&
							(hasInfoAnchor || hasDoor || hasExit)));

				if (!hasOutline && !hasVisibleEditorLayer) {
					return null;
				}

				const outlineBounds = hasOutline ? getOutlineBounds(outline) : null;
				const polygon = hasOutline ? pointsToPolygon(outline) : "";
				const outlineStroke =
					isVisible || isActive
						? "#ffffff"
						: "rgba(255, 255, 255, 0.4)";
				const outlineWidth = isVisible || isActive ? 4 : 2;

				return (
					<g
						key={stop.id}
						className={`house-group ${isVisible ? "is-visible" : ""} ${
							isActive ? "is-active" : ""
						}`}
						onMouseEnter={() => onHoverChange(stop.id)}
						onMouseLeave={() => onHoverChange(null)}
						onClick={(event) => {
							if (isDev && devInteractionMode !== "view") {
								return;
							}
							event.stopPropagation();
							onEnterStop(stop.id);
						}}
					>
						{hasOutline ? (
							<>
								<polygon 
									className="house-group__hit" 
									points={polygon} 
									fill="white" 
									fillOpacity="0" 
								/>
								<rect
									className="house-group__nav-outline"
									x={outlineBounds!.x}
									y={outlineBounds!.y}
									width={outlineBounds!.width}
									height={outlineBounds!.height}
									rx="0"
									ry="0"
									fill="white"
									fillOpacity="0"
									stroke={outlineStroke}
									strokeWidth={outlineWidth}
								/>
							</>
						) : null}
						{showSelectedStopOutline && hasOutline ? (
							<polyline className="active-stop-outline" points={polygon} fill="none" />
						) : null}
						{showSelectedStopAnchors ? (
							<g className="stop-dev-points">
								{showPointHandles && effectiveLayerVisibility.stopOutlines
									? outline.map((point, index) => (
											<g
												key={`${stop.id}-outline-${point.x}-${point.y}-${index}`}
												className={`dev-point dev-point--outline ${
													devInteractionMode === "move" ? "is-draggable" : ""
												}`}
												transform={`translate(${point.x} ${point.y})`}
												onPointerDown={(event) => {
													if (devInteractionMode !== "move") {
														return;
													}
													event.stopPropagation();
													onDragTargetChange({
														type: "stop-outline-point",
														stopId: stop.id,
														index,
													});
												}}
											>
												<circle r="4.5" />
												<text x="8" y="4">
													{index + 1}
												</text>
											</g>
										))
									: null}
								{effectiveLayerVisibility.stopAnchors && !showCaptureOnly ? (
									<>
										{isRenderablePoint(infoAnchor) ? (
											<g
												className={`dev-anchor dev-anchor--info ${
													devInteractionMode === "move" ? "is-draggable" : ""
												}`}
												transform={`translate(${infoAnchor.x} ${infoAnchor.y})`}
												onPointerDown={(event) => {
													if (devInteractionMode !== "move") {
														return;
													}
													event.stopPropagation();
													onDragTargetChange({
														type: "stop-anchor",
														stopId: stop.id,
														anchor: "infoAnchor",
													});
												}}
											>
												<circle r="6" />
												<text x="10" y="4">i</text>
											</g>
										) : null}
										{isRenderablePoint(door) ? (
											<g
												className={`dev-anchor dev-anchor--door ${
													devInteractionMode === "move" ? "is-draggable" : ""
												}`}
												transform={`translate(${door.x} ${door.y})`}
												onPointerDown={(event) => {
													if (devInteractionMode !== "move") {
														return;
													}
													event.stopPropagation();
													onDragTargetChange({
														type: "stop-anchor",
														stopId: stop.id,
														anchor: "door",
													});
												}}
											>
												<circle r="6" />
												<text x="10" y="4">D</text>
											</g>
										) : null}
										{isRenderablePoint(exit) ? (
											<g
												className={`dev-anchor dev-anchor--exit ${
													devInteractionMode === "move" ? "is-draggable" : ""
												}`}
												transform={`translate(${exit.x} ${exit.y})`}
												onPointerDown={(event) => {
													if (devInteractionMode !== "move") {
														return;
													}
													event.stopPropagation();
													onDragTargetChange({
														type: "stop-anchor",
														stopId: stop.id,
														anchor: "exit",
													});
												}}
											>
												<circle r="6" />
												<text x="10" y="4">E</text>
											</g>
										) : null}
									</>
								) : null}
							</g>
						) : null}
					</g>
				);
			})}

			<g
				className={`trainer-sprite ${characterVisible ? "" : "trainer-sprite--hidden"}`}
				transform={trainerTransform}
				pointerEvents="none"
				aria-hidden="true"
			>
				<ellipse className="trainer-sprite__shadow" cx="16" cy="34" rx="8" ry="3.5" />
				<g clipPath={`url(#${TRAINER_SPRITE_CLIP_ID})`}>
					<image
						className="trainer-sprite__sheet"
						href={TRAINER_SPRITE_PATH}
						x={-trainerSpriteColumn * TRAINER_SPRITE_RENDER_SIZE}
						y={-trainerSpriteRow * TRAINER_SPRITE_RENDER_SIZE}
						width={TRAINER_SPRITE_RENDER_SIZE * 4}
						height={TRAINER_SPRITE_RENDER_SIZE * 4}
						preserveAspectRatio="none"
					/>
				</g>
			</g>

			{/* Tooltip Layer - Always on top */}
			{stops.map((stop) => {
				const draftStop = devDrafts.stops[stop.id];
				const outline = draftStop?.outline?.length ? draftStop.outline : stop.outline;

				if (outline.length < 3) {
					return null;
				}

				const outlineBounds = getOutlineBounds(outline);
				const isVisible = showStopTooltip && visibleStopId === stop.id;
				const isActive = activeStopId === stop.id;
				const showKeyboardHint = showStopTooltip && focusStopId === stop.id && !isActive;
				const tooltipFrame = getTooltipFrame(
					outlineBounds,
					stop.shortLabel,
					mapHeight,
					mapWidth,
					showKeyboardHint,
				);

				if (!isVisible) return null;

				return (
					<g 
						key={`tooltip-${stop.id}`} 
						className="cursor-pointer"
						onMouseEnter={() => onHoverChange(stop.id)}
						onMouseLeave={() => onHoverChange(null)}
						onClick={(event) => {
							event.stopPropagation();
							onEnterStop(stop.id);
						}}
					>
						<g
							className="house-group__info"
							transform={`translate(${tooltipFrame.x} ${tooltipFrame.y})`}
						>
							<rect width={tooltipFrame.width} height={tooltipFrame.height} rx="0" ry="0" />
							<text x={tooltipFrame.width / 2} y="22" textAnchor="middle">
								{stop.shortLabel}
							</text>
						</g>
						{showKeyboardHint && (
							<text
								className="house-group__hint-text"
								x={tooltipFrame.x + tooltipFrame.width / 2}
								y={tooltipFrame.y + tooltipFrame.height + 14}
								textAnchor="middle"
							>
								Press F to enter
							</text>
						)}
					</g>
				);
			})}
		</svg>
	);
}
