"use client";

import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent, type RefObject } from "react";
import type { Position, StopId, TownStop } from "@/lib/portfolio-content";
import type {
	DevInteractionMode,
	DevLayerVisibility,
	DevMapDrafts,
	DevPolygonKind,
	DevToolMode,
} from "./map-dev-tool";
import {
	DOOR_FRAME_SEQUENCE,
	DOOR_RENDER_HEIGHT,
	DOOR_RENDER_WIDTH,
	DOOR_SPRITE_ROW_COUNT,
	DOOR_SPRITE_PATH,
	getAmbientIdleFrame,
	getAmbientWalkFrames,
	getAnimatedCell,
	getEffectWaterRect,
	getOverlayOutlineBounds,
	getOneShotRowCell,
	getTooltipFrame,
	getTrainerSpriteRow,
	isRenderablePoint,
	TRAINER_SPRITE_CLIP_ID,
	TRAINER_SPRITE_PATH,
	TRAINER_SPRITE_RENDER_SIZE,
	WATER_SPRITE_PATH,
	WATER_TILE_COLUMNS,
	WATER_TILE_ROWS,
} from "./town-map-overlay-helpers";
import type {
	AmbientSpriteActor,
} from "./town-map-overlay-types";
import type { DragTarget } from "./town-map-utils";
import { isPolygonMode, pointsToPolygon } from "./town-map-utils";

const STATIC_AMBIENT_SPRITE_IDS = new Set<string>();

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
	const waterRect = getEffectWaterRect(devDrafts.effects.waterArea);
	const waterTileColumnCount = waterRect
		? Math.max(1, Math.ceil(waterRect.width / 60))
		: 0;
	const waterTileRowCount = waterRect
		? Math.max(1, Math.ceil(waterRect.height / 57))
		: 0;
	const [doorFrames, setDoorFrames] = useState<Partial<Record<StopId, number>>>({});
	const activeDoorIds = useMemo(() => {
		const next = new Set<StopId>();

		if (activeStopId) {
			next.add(activeStopId);
		}

		if (showStopTooltip && visibleStopId) {
			next.add(visibleStopId);
		}

		return next;
	}, [activeStopId, showStopTooltip, visibleStopId]);

	useEffect(() => {
		const intervalId = window.setInterval(() => {
			setDoorFrames((current) => {
				let changed = false;
				const next: Partial<Record<StopId, number>> = { ...current };

				for (const stop of stops) {
					const isOpenTarget = activeDoorIds.has(stop.id);
					const frame = next[stop.id] ?? 0;
					const targetFrame = isOpenTarget ? DOOR_FRAME_SEQUENCE.length - 1 : 0;

					if (frame === targetFrame) {
						continue;
					}

					next[stop.id] = frame + (isOpenTarget ? 1 : -1);
					changed = true;
				}

				return changed ? next : current;
			});
		}, 85);

		return () => window.clearInterval(intervalId);
	}, [activeDoorIds, stops]);

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
				{stops.map((stop) => {
					const draftStop = devDrafts.stops[stop.id];
					const door = draftStop?.door ?? stop.door;
					const doorFxDraft = devDrafts.effects.doorFx[stop.id];
					const doorFxAnchor = doorFxDraft?.anchor ?? door;
					const doorFxScale = doorFxDraft?.scale ?? 1;
					const doorRenderWidth = DOOR_RENDER_WIDTH * doorFxScale;
					const doorRenderHeight = DOOR_RENDER_HEIGHT * doorFxScale;

					if (!isRenderablePoint(doorFxAnchor) || doorFxDraft?.hidden) {
						return null;
					}

					return (
						<clipPath id={`door-${stop.id}-clip`} key={`door-${stop.id}-clip`}>
							<rect
								x={doorFxAnchor.x - doorRenderWidth / 2}
								y={doorFxAnchor.y - doorRenderHeight + 3}
								width={doorRenderWidth}
								height={doorRenderHeight}
							/>
						</clipPath>
					);
				})}
				{waterRect ? (
					<clipPath id="fountain-water-clip">
						<rect
							x={waterRect.x}
							y={waterRect.y}
							width={waterRect.width}
							height={waterRect.height}
							rx="6"
							ry="6"
						/>
					</clipPath>
				) : null}
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
						const spriteShouldWalkAnimate =
							spriteIsStatic || (sprite.moving && !sprite.emoteVisible);
						const spriteRow = spriteIsStatic
							? (sprite.row ?? 0)
							: getTrainerSpriteRow(sprite.facing);
						const idleFrame = getAmbientIdleFrame(sprite.idleFrame, sprite.idleColumn);
						const walkFrames = getAmbientWalkFrames(
							sprite.columns,
							sprite.walkFrames,
							sprite.idleFrame,
							sprite.idleColumn,
						);
						const walkFrame =
							walkFrames[Math.floor(worldSpriteTick / 2) % walkFrames.length] ??
							idleFrame;
						const spriteCell = {
							column: spriteShouldWalkAnimate ? walkFrame : idleFrame,
							row: spriteRow,
						};
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

			{waterRect ? (
				<g className="tile-fx-layer" pointerEvents="none" aria-hidden="true">
					{Array.from(
						{ length: waterTileColumnCount * waterTileRowCount },
						(_, tileIndex) => {
							const frameRow =
								(Math.floor(worldSpriteTick / 2) + tileIndex * 3) % WATER_TILE_ROWS;
							const frameColumn = tileIndex % WATER_TILE_COLUMNS;
							const tileX =
								waterRect.x + (tileIndex % waterTileColumnCount) * 60;
							const tileY =
								waterRect.y + Math.floor(tileIndex / waterTileColumnCount) * 57;

							return (
								<g clipPath="url(#fountain-water-clip)" key={`water-${tileIndex}`}>
									<image
										className="ambient-sprite__effect"
										href={WATER_SPRITE_PATH}
										x={tileX - frameColumn * 60}
										y={tileY - frameRow * 57}
										width={WATER_TILE_COLUMNS * 60}
										height={WATER_TILE_ROWS * 57}
										opacity="0.68"
										preserveAspectRatio="none"
									/>
								</g>
							);
						},
					)}
				</g>
			) : null}

			{stops.map((stop) => {
				const draftStop = devDrafts.stops[stop.id];
				const outline = draftStop?.outline?.length ? draftStop.outline : stop.outline;
				const door = draftStop?.door ?? stop.door;
				const doorFxDraft = devDrafts.effects.doorFx[stop.id];
				const doorFxAnchor = doorFxDraft?.anchor ?? door;
				const doorFxHidden = doorFxDraft?.hidden ?? false;
				const doorFxScale = doorFxDraft?.scale ?? 1;
				const doorRenderWidth = DOOR_RENDER_WIDTH * doorFxScale;
				const doorRenderHeight = DOOR_RENDER_HEIGHT * doorFxScale;
				const exit = draftStop?.exit ?? stop.exit;
				const infoAnchor = draftStop?.infoAnchor ?? stop.infoAnchor;
				const hasOutline = outline.length >= 3;
				const hasInfoAnchor = isRenderablePoint(infoAnchor);
				const hasDoor = isRenderablePoint(door);
				const hasDoorFxAnchor = isRenderablePoint(doorFxAnchor);
				const hasDoorFx = hasDoorFxAnchor && !doorFxHidden;
				const hasExit = isRenderablePoint(exit);
				const isVisible = showStopTooltip && visibleStopId === stop.id;
				const isActive = activeStopId === stop.id;
				const isSelectedEditorStop =
					devMode !== "all" &&
					devMode !== "effect-water" &&
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
							((devMode === "stop-info" && hasInfoAnchor) ||
								(devMode === "stop-door" && hasDoor) ||
								(devMode === "stop-exit" && hasExit) ||
								(devMode === "effect-door" && hasDoorFx))));

				if (!hasOutline && !hasVisibleEditorLayer) {
					return null;
				}

				const outlineBounds = hasOutline ? getOverlayOutlineBounds(outline) : null;
				const polygon = hasOutline ? pointsToPolygon(outline) : "";
				const outlineStroke =
					isVisible || isActive
						? "#ffffff"
						: "rgba(255, 255, 255, 0.4)";
				const outlineWidth = isVisible || isActive ? 4 : 2;
				const doorFrame = doorFrames[stop.id] ?? 0;
				const doorSourceRow = DOOR_FRAME_SEQUENCE[doorFrame] ?? DOOR_FRAME_SEQUENCE[0];

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
						{hasDoorFx ? (
							<g className="door-fx" pointerEvents="none">
								<g clipPath={`url(#door-${stop.id}-clip)`}>
									<image
										href={DOOR_SPRITE_PATH}
										x={doorFxAnchor.x - doorRenderWidth / 2}
										y={doorFxAnchor.y - doorRenderHeight + 3 - doorSourceRow * doorRenderHeight}
										width={doorRenderWidth}
										height={doorRenderHeight * DOOR_SPRITE_ROW_COUNT}
										opacity={isVisible || isActive ? 1 : 0.9}
										preserveAspectRatio="none"
									/>
								</g>
							</g>
						) : null}
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
										{devMode === "stop-info" && isRenderablePoint(infoAnchor) ? (
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
										{devMode === "stop-door" && isRenderablePoint(door) ? (
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
										{devMode === "stop-exit" && isRenderablePoint(exit) ? (
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
										{devMode === "effect-door" && hasDoorFxAnchor ? (
											<g
												className={`dev-anchor dev-anchor--door ${
													devInteractionMode === "move" ? "is-draggable" : ""
												}`}
												transform={`translate(${doorFxAnchor.x} ${doorFxAnchor.y})`}
												onPointerDown={(event) => {
													if (devInteractionMode !== "move") {
														return;
													}
													event.stopPropagation();
													onDragTargetChange({
														type: "effect-door-anchor",
														stopId: stop.id,
													});
												}}
											>
												<circle r="6" />
												<text x="10" y="4">FX</text>
											</g>
										) : null}
									</>
								) : null}
							</g>
						) : null}
					</g>
				);
			})}
			{isDev && devMode === "effect-water" && waterRect ? (
				<g className="stop-dev-points">
					<rect
						className="active-stop-outline"
						x={waterRect.x}
						y={waterRect.y}
						width={waterRect.width}
						height={waterRect.height}
						fill="rgba(0, 136, 248, 0.12)"
					/>
					{showPointHandles
						? (["start", "end"] as const).map((corner) => {
								const point = devDrafts.effects.waterArea?.[corner];
								if (!point) {
									return null;
								}

								return (
									<g
										key={`water-${corner}`}
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
												type: "effect-water-corner",
												corner,
											});
										}}
									>
										<circle r="5" />
										<text x="8" y="4">
											{corner === "start" ? "1" : "2"}
										</text>
									</g>
								);
							})
						: null}
				</g>
			) : null}

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

				const outlineBounds = getOverlayOutlineBounds(outline);
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
