"use client";

import type { MouseEvent as ReactMouseEvent, RefObject } from "react";
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

export function TownMapOverlay({
	activeDraftPoints,
	activePolygonKind,
	activeStopId,
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
	trainerTransform,
	visibleStopId,
}: {
	activeDraftPoints: Position[];
	activePolygonKind: DevPolygonKind | null;
	activeStopId: StopId | null;
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
	trainerTransform: string;
	visibleStopId: StopId | null;
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
				className={`trainer-svg ${characterVisible ? "" : "trainer-svg--hidden"}`}
				transform={trainerTransform}
				pointerEvents="none"
				aria-hidden="true"
			>
				{/* Shadow */}
				<ellipse className="trainer-svg__shadow" cx="16" cy="36" rx="10" ry="4" />
				
				{/* Backpack (Classic yellow bag) - Hidden when facing up, on sides when facing left/right */}
				{facing === "down" && (
					<rect fill="#ffd056" x="21" y="18" width="4" height="8" />
				)}
				{facing === "left" && (
					<rect fill="#ffd056" x="18" y="17" width="5" height="9" />
				)}
				{facing === "right" && (
					<rect fill="#ffd056" x="9" y="17" width="5" height="9" />
				)}
				{facing === "up" && (
					<rect fill="#ffd056" x="10" y="17" width="12" height="6" />
				)}
				
				{/* Legs/Pants */}
				<rect fill="#303030" x="11" y="28" width="4" height="6" />
				<rect fill="#303030" x="17" y="28" width="4" height="6" />
				
				{/* Body/Coat */}
				<rect className="trainer-svg__coat" x="9" y="16" width="14" height="13" />
				<rect fill="#ffffff" x="13" y="16" width="6" height="4" />
				
				{/* Face/Skin */}
				<rect className="trainer-svg__face" x="11" y="8" width="10" height="9" />
				
				{/* Eyes - Only visible when facing down, left, or right */}
				{facing === "down" && (
					<>
						<rect fill="#000000" x="13" y="11" width="1" height="2" />
						<rect fill="#000000" x="18" y="11" width="1" height="2" />
					</>
				)}
				{facing === "left" && (
					<rect fill="#000000" x="12" y="11" width="1" height="2" />
				)}
				{facing === "right" && (
					<rect fill="#000000" x="19" y="11" width="1" height="2" />
				)}
				
				{/* Cap (Backwards cap) */}
				<rect className="trainer-svg__cap" x="9" y="4" width="14" height="5" />
				{/* Bill flips based on direction */}
				{facing === "down" && <rect className="trainer-svg__cap" x="7" y="6" width="2" height="3" />}
				{facing === "up" && <rect className="trainer-svg__cap" x="23" y="6" width="2" height="3" />}
				{facing === "left" && <rect className="trainer-svg__cap" x="15" y="3" width="3" height="2" />}
				{facing === "right" && <rect className="trainer-svg__cap" x="14" y="3" width="3" height="2" />}
				
				{/* Dynamic Outlines based on direction */}
				<path
					className="trainer-svg__outline"
					fill="none"
					d={`
						M9 4h14v5h-14z 
						${facing === "down" ? "M7 6h2v3h-2z" : ""}
						${facing === "up" ? "M23 6h2v3h-2z" : ""}
						${facing === "left" || facing === "right" ? "M14 3h5v2h-5z" : ""}
						M9 16h14v13h-14z 
						M11 8h10v9h-10z 
						M11 28h4v6h-4z 
						M17 28h4v6h-4z
						${facing === "down" ? "M21 18h4v8h-4z" : ""}
						${facing === "up" ? "M10 17h12v6h-12z" : ""}
					`}
				/>
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
