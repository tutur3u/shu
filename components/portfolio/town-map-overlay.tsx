"use client";

import type { MouseEvent as ReactMouseEvent, RefObject } from "react";
import { MAP_HEIGHT, MAP_WIDTH, type Position, type StopId, type TownStop } from "@/lib/portfolio-content";
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
	showKeyboardHint: boolean,
) {
	const width = clamp(Math.round(label.length * 11.2 + 22), 88, 240);
	const height = 34;
	const hintAllowance = showKeyboardHint ? 18 : 0;
	const centerX = outlineBounds.x + outlineBounds.width / 2;
	const x = clamp(centerX - width / 2, 10, MAP_WIDTH - width - 10);
	const y = clamp(
		outlineBounds.y + 12,
		10,
		MAP_HEIGHT - height - hintAllowance - 10,
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
	focusStopId,
	isDev,
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
	focusStopId: StopId | null;
	isDev: boolean;
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
			viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
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
				const infoAnchor = draftStop?.infoAnchor ?? stop.infoAnchor;
				const outlineBounds = getOutlineBounds(outline);
				const polygon = pointsToPolygon(outline);
				const isVisible = showStopTooltip && visibleStopId === stop.id;
				const isActive = activeStopId === stop.id;
				const showKeyboardHint =
					showStopTooltip && focusStopId === stop.id && !isActive;
				const tooltipFrame = getTooltipFrame(
					outlineBounds,
					stop.shortLabel,
					showKeyboardHint,
				);
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
				const outlineStroke =
					isVisible || isActive
						? "rgba(255, 246, 196, 0.76)"
						: "rgba(255, 244, 184, 0.34)";
				const outlineWidth = isVisible || isActive ? 2.7 : 2.1;

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
						<polygon className="house-group__hit" points={polygon} fill="transparent" />
						<rect
							className="house-group__nav-outline"
							x={outlineBounds.x}
							y={outlineBounds.y}
							width={outlineBounds.width}
							height={outlineBounds.height}
							rx="18"
							ry="18"
							fill="none"
							stroke={outlineStroke}
							strokeWidth={outlineWidth}
						/>
						{showSelectedStopOutline ? (
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
										<g
											className={`dev-anchor dev-anchor--door ${
												devInteractionMode === "move" ? "is-draggable" : ""
											}`}
											transform={`translate(${(draftStop?.door ?? stop.door).x} ${(draftStop?.door ?? stop.door).y})`}
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
										<g
											className={`dev-anchor dev-anchor--exit ${
												devInteractionMode === "move" ? "is-draggable" : ""
											}`}
											transform={`translate(${(draftStop?.exit ?? stop.exit).x} ${(draftStop?.exit ?? stop.exit).y})`}
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
									</>
								) : null}
							</g>
						) : null}
						{isVisible ? (
							<g
								className="house-group__info"
								transform={`translate(${tooltipFrame.x} ${tooltipFrame.y})`}
								pointerEvents="none"
							>
								<rect width={tooltipFrame.width} height={tooltipFrame.height} rx="10" ry="10" />
								<text
									x={tooltipFrame.width / 2}
									y="22"
									textAnchor="middle"
								>
									{stop.shortLabel}
								</text>
							</g>
						) : null}
						{isVisible && showKeyboardHint ? (
							<text
								className="house-group__hint-text"
								x={tooltipFrame.x + tooltipFrame.width / 2}
								y={tooltipFrame.y + tooltipFrame.height + 14}
								textAnchor="middle"
							>
								Press F to enter
							</text>
						) : null}
					</g>
				);
			})}

			<g
				className={`trainer-svg ${characterVisible ? "" : "trainer-svg--hidden"}`}
				transform={trainerTransform}
				aria-hidden="true"
			>
				<ellipse className="trainer-svg__shadow" cx="16" cy="35" rx="10" ry="4" />
				<rect className="trainer-svg__coat" x="9" y="17" width="14" height="12" rx="2" />
				<rect className="trainer-svg__face" x="10" y="9" width="12" height="10" rx="2" />
				<rect className="trainer-svg__cap" x="8" y="3" width="16" height="8" rx="2" />
				<rect className="trainer-svg__outline" x="8" y="3" width="16" height="8" rx="2" />
				<rect className="trainer-svg__outline" x="10" y="9" width="12" height="10" rx="2" />
				<rect className="trainer-svg__outline" x="9" y="17" width="14" height="12" rx="2" />
			</g>
		</svg>
	);
}
