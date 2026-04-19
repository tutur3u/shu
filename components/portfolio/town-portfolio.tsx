"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
	MAP_HEIGHT,
	MAP_WIDTH,
	type PortfolioContent,
	type Position,
	type StopId,
	type TownStop,
	startPosition,
} from "@/lib/portfolio-content";
import {
	createEmptyDevDrafts,
	MapDevTool,
	type DevMapDrafts,
	type DevInteractionMode,
	type DevLayerVisibility,
	type DevPolygonKind,
	type DevToolMode,
	type DevPolygonDraft,
} from "./map-dev-tool";
import { PortfolioStopPanel } from "./portfolio-stop-panel";
import { TownMapOverlay } from "./town-map-overlay";
import {
	clamp,
	type DragTarget,
	getRelevantLayerKeys,
	getStop,
	isPointInPolygon,
	isPolygonMode,
} from "./town-map-utils";

function getOutlineBounds(points: Position[]) {
	const xs = points.map((point) => point.x);
	const ys = points.map((point) => point.y);
	return {
		x: Math.min(...xs),
		y: Math.min(...ys),
		width: Math.max(...xs) - Math.min(...xs),
		height: Math.max(...ys) - Math.min(...ys),
	};
}

function getDefaultLayerVisibility(mode: DevToolMode): DevLayerVisibility {
	if (mode === "all") {
		return {
			walkable: false,
			blocked: false,
			sections: false,
			stopOutlines: true,
			stopAnchors: false,
			pointHandles: false,
		};
	}

	if (mode === "walkable") {
		return {
			walkable: true,
			blocked: false,
			sections: false,
			stopOutlines: false,
			stopAnchors: false,
			pointHandles: true,
		};
	}

	if (mode === "blocked") {
		return {
			walkable: false,
			blocked: true,
			sections: false,
			stopOutlines: false,
			stopAnchors: false,
			pointHandles: true,
		};
	}

	if (mode === "section") {
		return {
			walkable: false,
			blocked: false,
			sections: true,
			stopOutlines: false,
			stopAnchors: false,
			pointHandles: true,
		};
	}

	if (mode === "stop-outline") {
		return {
			walkable: false,
			blocked: false,
			sections: false,
			stopOutlines: true,
			stopAnchors: false,
			pointHandles: true,
		};
	}

	return {
		walkable: false,
		blocked: false,
		sections: false,
		stopOutlines: true,
		stopAnchors: true,
		pointHandles: false,
	};
}

export function TownPortfolio({
	content,
	stops,
}: {
	content: PortfolioContent;
	stops: TownStop[];
}) {
	const editorEnabled = true;
	const [guideOpen, setGuideOpen] = useState(false);
	const [hoveredStopId, setHoveredStopId] = useState<StopId | null>(null);
	const [devToolOpen, setDevToolOpen] = useState(false);
	const [devMode, setDevMode] = useState<DevToolMode>("all");
	const [devInteractionMode, setDevInteractionMode] =
		useState<DevInteractionMode>("view");
	const [devRegionId, setDevRegionId] = useState("walkable-main");
	const [devSelectedStopId, setDevSelectedStopId] = useState<StopId>("about");
	const [devLayerVisibility, setDevLayerVisibility] = useState<DevLayerVisibility>(
		() => getDefaultLayerVisibility("all"),
	);
	const [devDrafts, setDevDrafts] = useState<DevMapDrafts>(createEmptyDevDrafts);
	const [draftsHydrated, setDraftsHydrated] = useState(false);
	const [characterPosition, setCharacterPosition] = useState<Position>(startPosition);
	const [activeStopId, setActiveStopId] = useState<StopId | null>(null);
	const [travelingTo, setTravelingTo] = useState<StopId | null>(null);
	const [characterVisible, setCharacterVisible] = useState(true);
	const [skipTravel, setSkipTravel] = useState(false);
	const [lastStopId, setLastStopId] = useState<StopId | null>(null);
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
	const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
	const [keyboardMoving, setKeyboardMoving] = useState(false);

	const travelFrameRef = useRef<number | null>(null);
	const movementFrameRef = useRef<number | null>(null);
	const movementTimestampRef = useRef<number | null>(null);
	const movementTickRef = useRef<((timestamp: number) => void) | null>(null);
	const pressedKeysRef = useRef<Set<string>>(new Set());
	const positionRef = useRef(startPosition);
	const svgRef = useRef<SVGSVGElement | null>(null);
	const effectiveStops = useMemo(
		() =>
			stops.map((stop) => {
				const draft = devDrafts.stops[stop.id];

				return {
					...stop,
					outline: draft?.outline ?? stop.outline,
					infoAnchor: draft?.infoAnchor ?? stop.infoAnchor,
					door: draft?.door ?? stop.door,
					exit: draft?.exit ?? stop.exit,
				};
			}),
		[devDrafts.stops, stops],
	);
	const activeStop = activeStopId ? getStop(effectiveStops, activeStopId) : null;
	const instantTravel = skipTravel || prefersReducedMotion;
	const sceneLabel = activeStop
		? `${activeStop.shortLabel} interior`
		: travelingTo
			? `Walking to ${getStop(effectiveStops, travelingTo).shortLabel}`
			: lastStopId
				? `Outside ${getStop(effectiveStops, lastStopId).shortLabel}`
				: "Town square";

	useEffect(() => {
		const frame = window.requestAnimationFrame(() => {
			const rawDrafts = window.localStorage.getItem("pokemon-town-dev-drafts");

			if (!rawDrafts) {
				setDraftsHydrated(true);
				return;
			}

			try {
				setDevDrafts(JSON.parse(rawDrafts) as DevMapDrafts);
			} catch {
				window.localStorage.removeItem("pokemon-town-dev-drafts");
			}

			setDraftsHydrated(true);
		});

		return () => window.cancelAnimationFrame(frame);
	}, []);

	useEffect(() => {
		if (!draftsHydrated) {
			return;
		}

		window.localStorage.setItem(
			"pokemon-town-dev-drafts",
			JSON.stringify(devDrafts),
		);
	}, [devDrafts, draftsHydrated]);

	useEffect(() => {
		const media = window.matchMedia("(prefers-reduced-motion: reduce)");
		const syncMotion = () => setPrefersReducedMotion(media.matches);

		syncMotion();
		media.addEventListener("change", syncMotion);

		return () => media.removeEventListener("change", syncMotion);
	}, []);

	useEffect(() => {
		positionRef.current = characterPosition;
	}, [characterPosition]);

	useEffect(() => {
		return () => {
			if (travelFrameRef.current) {
				window.cancelAnimationFrame(travelFrameRef.current);
			}
			if (movementFrameRef.current) {
				window.cancelAnimationFrame(movementFrameRef.current);
			}
		};
	}, []);

	function clearTimer() {
		if (travelFrameRef.current) {
			window.cancelAnimationFrame(travelFrameRef.current);
			travelFrameRef.current = null;
		}
	}

	function stopMovementLoop() {
		if (movementFrameRef.current) {
			window.cancelAnimationFrame(movementFrameRef.current);
			movementFrameRef.current = null;
		}
		movementTimestampRef.current = null;
		setKeyboardMoving(false);
	}

	function runTravel(from: Position, to: Position, onDone: () => void) {
		clearTimer();
		const distance = Math.hypot(to.x - from.x, to.y - from.y);
		const duration =
			instantTravel || distance < 4
				? 0
				: clamp(Math.round(distance * 1.6), 180, 720);

		if (duration === 0) {
			setCharacterPosition(to);
			positionRef.current = to;
			onDone();
			return;
		}

		const deltaX = to.x - from.x;
		const deltaY = to.y - from.y;
		let startedAt: number | null = null;

		const step = (timestamp: number) => {
			if (startedAt === null) {
				startedAt = timestamp;
			}

			const progress = Math.min((timestamp - startedAt) / duration, 1);
			const nextPosition = {
				x: from.x + deltaX * progress,
				y: from.y + deltaY * progress,
			};

			setCharacterPosition(nextPosition);
			positionRef.current = nextPosition;

			if (progress < 1) {
				travelFrameRef.current = window.requestAnimationFrame(step);
				return;
			}

			travelFrameRef.current = null;
			onDone();
		};

		travelFrameRef.current = window.requestAnimationFrame(step);
	}

	function toMapPoint(clientX: number, clientY: number) {
		if (!svgRef.current) {
			return null;
		}

		const svg = svgRef.current;
		const point = svg.createSVGPoint();
		point.x = clientX;
		point.y = clientY;

		const nextPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());

		return {
			x: clamp(nextPoint.x, 0, MAP_WIDTH),
			y: clamp(nextPoint.y, 0, MAP_HEIGHT),
		};
	}

	function updateDrafts(
		updater: (current: DevMapDrafts) => DevMapDrafts,
	) {
		setDevDrafts((current) => updater(current));
	}

	function updateLayerVisibility<K extends keyof DevLayerVisibility>(
		layer: K,
		value: DevLayerVisibility[K],
	) {
		setDevLayerVisibility((current) => ({ ...current, [layer]: value }));
	}

	function handleDevModeChange(nextMode: DevToolMode) {
		setDevMode(nextMode);
		setDevLayerVisibility(getDefaultLayerVisibility(nextMode));

		if (nextMode === "all" && devInteractionMode === "capture") {
			setDevInteractionMode("view");
		}
	}

	function getNextPolygonZoneId(kind: DevPolygonKind) {
		const existingIds = new Set(
			devDrafts.polygons
				.filter((entry) => entry.kind === kind)
				.map((entry) => entry.id),
		);
		let index = existingIds.size + 1;
		let candidate = `${kind}-${index}`;

		while (existingIds.has(candidate)) {
			index += 1;
			candidate = `${kind}-${index}`;
		}

		return candidate;
	}

	function createPolygonZone() {
		if (!isPolygonMode(devMode)) {
			return;
		}

		const nextId = getNextPolygonZoneId(devMode);

		updateDrafts((current) => ({
			...current,
			polygons: [
				...current.polygons,
				{ id: nextId, kind: devMode, points: [] } satisfies DevPolygonDraft,
			],
		}));
		setDevRegionId(nextId);
		setDevInteractionMode("capture");
	}

	function deleteActivePolygonZone() {
		if (!isPolygonMode(devMode)) {
			return;
		}

		const remaining = devDrafts.polygons.filter(
			(entry) => !(entry.kind === devMode && entry.id === devRegionId),
		);
		const nextActive =
			remaining.find((entry) => entry.kind === devMode)?.id ??
			getNextPolygonZoneId(devMode);

		updateDrafts((current) => ({
			...current,
			polygons: current.polygons.filter(
				(entry) => !(entry.kind === devMode && entry.id === devRegionId),
			),
		}));
		setDevRegionId(nextActive);
	}

	function ensureStopDraft(
		current: DevMapDrafts,
		stopId: StopId,
	) {
		const baseStop = getStop(stops, stopId);
		const existing = current.stops[stopId];

		return {
			outline: existing?.outline ?? baseStop.outline,
			infoAnchor: existing?.infoAnchor ?? baseStop.infoAnchor,
			door: existing?.door ?? baseStop.door,
			exit: existing?.exit ?? baseStop.exit,
		};
	}

	function moveDraftPoint(target: DragTarget, point: Position) {
		updateDrafts((current) => {
			if (target.type === "polygon-point") {
				return {
					...current,
					polygons: current.polygons.map((entry) =>
						entry.kind === target.kind && entry.id === target.id
							? {
									...entry,
									points: entry.points.map((entryPoint, index) =>
										index === target.index ? point : entryPoint,
									),
								}
							: entry,
					),
				};
			}

			const nextStopDraft = ensureStopDraft(current, target.stopId);

			if (target.type === "stop-outline-point") {
				nextStopDraft.outline = nextStopDraft.outline.map((entryPoint, index) =>
					index === target.index ? point : entryPoint,
				);
			} else {
				nextStopDraft[target.anchor] = point;
			}

			return {
				...current,
				stops: {
					...current.stops,
					[target.stopId]: nextStopDraft,
				},
			};
		});
	}

	const onDragPointerMove = useEffectEvent((event: PointerEvent) => {
		if (!dragTarget) {
			return;
		}

		const nextPoint = toMapPoint(event.clientX, event.clientY);

		if (!nextPoint) {
			return;
		}

		moveDraftPoint(dragTarget, nextPoint);
	});

	const onDragPointerUp = useEffectEvent(() => {
		setDragTarget(null);
	});

	useEffect(() => {
		if (!dragTarget) {
			return;
		}

		const handlePointerMove = (event: PointerEvent) => onDragPointerMove(event);
		const handlePointerUp = () => onDragPointerUp();

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, [dragTarget]);

	function addDevPoint(point: Position) {
		updateDrafts((current) => {
			if (isPolygonMode(devMode)) {
				const nextPolygons = [...current.polygons];
				const index = nextPolygons.findIndex(
					(entry) => entry.kind === devMode && entry.id === devRegionId,
				);

				if (index >= 0) {
					nextPolygons[index] = {
						...nextPolygons[index],
						points: [...nextPolygons[index].points, point],
					};
				} else {
					nextPolygons.push({
						id: devRegionId,
						kind: devMode satisfies DevPolygonKind,
						points: [point],
					});
				}

				return { ...current, polygons: nextPolygons };
			}

			const stopDraft = current.stops[devSelectedStopId] ?? {};
			const nextStopDraft =
				devMode === "stop-outline"
					? { ...stopDraft, outline: [...(stopDraft.outline ?? []), point] }
					: devMode === "stop-info"
						? { ...stopDraft, infoAnchor: point }
						: devMode === "stop-door"
							? { ...stopDraft, door: point }
							: { ...stopDraft, exit: point };

			return {
				...current,
				stops: {
					...current.stops,
					[devSelectedStopId]: nextStopDraft,
				},
			};
		});
	}

	function undoDevPoint() {
		updateDrafts((current) => {
			if (isPolygonMode(devMode)) {
				const nextPolygons = current.polygons.map((entry) =>
					entry.kind === devMode && entry.id === devRegionId
						? { ...entry, points: entry.points.slice(0, -1) }
						: entry,
				);

				return { ...current, polygons: nextPolygons };
			}

			const stopDraft = current.stops[devSelectedStopId];

			if (!stopDraft) {
				return current;
			}

			const nextStopDraft =
				devMode === "stop-outline"
					? { ...stopDraft, outline: stopDraft.outline?.slice(0, -1) ?? [] }
					: devMode === "stop-info"
						? { ...stopDraft, infoAnchor: undefined }
						: devMode === "stop-door"
							? { ...stopDraft, door: undefined }
							: { ...stopDraft, exit: undefined };

			return {
				...current,
				stops: {
					...current.stops,
					[devSelectedStopId]: nextStopDraft,
				},
			};
		});
	}

	function clearActiveDraft() {
		updateDrafts((current) => {
			if (isPolygonMode(devMode)) {
				return {
					...current,
					polygons: current.polygons.filter(
						(entry) => !(entry.kind === devMode && entry.id === devRegionId),
					),
				};
			}

			const stopDraft = current.stops[devSelectedStopId];

			if (!stopDraft) {
				return current;
			}

			const nextStopDraft =
				devMode === "stop-outline"
					? { ...stopDraft, outline: [] }
					: devMode === "stop-info"
						? { ...stopDraft, infoAnchor: undefined }
						: devMode === "stop-door"
							? { ...stopDraft, door: undefined }
							: { ...stopDraft, exit: undefined };

			return {
				...current,
				stops: {
					...current.stops,
					[devSelectedStopId]: nextStopDraft,
				},
			};
		});
	}

	async function copyText(text: string) {
		await navigator.clipboard.writeText(text);
	}

	async function copyActiveDraft() {
		if (isPolygonMode(devMode)) {
			const polygon = devDrafts.polygons.find(
				(entry) => entry.kind === devMode && entry.id === devRegionId,
			);

			if (polygon) {
				await copyText(JSON.stringify(polygon, null, 2));
			}

			return;
		}

		const stopDraft = devDrafts.stops[devSelectedStopId];
		if (stopDraft) {
			await copyText(JSON.stringify({ [devSelectedStopId]: stopDraft }, null, 2));
		}
	}

	async function copyAllDrafts() {
		await copyText(JSON.stringify(devDrafts, null, 2));
	}

	const effectiveWalkablePolygons = useMemo(() => {
		return devDrafts.polygons
			.filter((entry) => entry.kind === "walkable" && entry.points.length >= 3)
			.map((entry) => entry.points);
	}, [devDrafts.polygons]);

	const effectiveBlockedPolygons = useMemo(
		() =>
			devDrafts.polygons
				.filter((entry) => entry.kind === "blocked" && entry.points.length >= 3)
				.map((entry) => entry.points),
		[devDrafts.polygons],
	);
	const relevantLayerKeys = useMemo(() => getRelevantLayerKeys(devMode), [devMode]);
	const effectiveLayerVisibility = useMemo(
		() => ({
			walkable:
				relevantLayerKeys.includes("walkable") && devLayerVisibility.walkable,
			blocked:
				relevantLayerKeys.includes("blocked") && devLayerVisibility.blocked,
			sections:
				relevantLayerKeys.includes("sections") && devLayerVisibility.sections,
			stopOutlines:
				relevantLayerKeys.includes("stopOutlines") &&
				devLayerVisibility.stopOutlines,
			stopAnchors:
				relevantLayerKeys.includes("stopAnchors") &&
				devLayerVisibility.stopAnchors,
			pointHandles:
				relevantLayerKeys.includes("pointHandles") &&
				devLayerVisibility.pointHandles,
		}),
		[devLayerVisibility, relevantLayerKeys],
	);

	const activePolygonDraft = useMemo(() => {
		if (!isPolygonMode(devMode)) {
			return null;
		}

		return (
			devDrafts.polygons.find(
				(entry) => entry.kind === devMode && entry.id === devRegionId,
			) ?? null
		);
	}, [devDrafts.polygons, devMode, devRegionId]);

	const activeStopDraft = useMemo(() => {
		if (devMode === "all" || isPolygonMode(devMode)) {
			return null;
		}

		const stop = getStop(stops, devSelectedStopId);
		const draft = devDrafts.stops[devSelectedStopId];

		return {
			outline: draft?.outline ?? stop.outline,
			infoAnchor: draft?.infoAnchor ?? stop.infoAnchor,
			door: draft?.door ?? stop.door,
			exit: draft?.exit ?? stop.exit,
		};
	}, [devDrafts.stops, devMode, devSelectedStopId, stops]);

	const activeDraftPoints = useMemo(() => {
		if (activePolygonDraft) {
			return activePolygonDraft.points;
		}

		if (devMode === "stop-outline" && activeStopDraft) {
			return activeStopDraft.outline;
		}

		return [];
	}, [activePolygonDraft, activeStopDraft, devMode]);

	const showCaptureOnly = devInteractionMode === "capture";
	const showPointHandles =
		effectiveLayerVisibility.pointHandles && !showCaptureOnly;
	const activePolygonKind = isPolygonMode(devMode) ? devMode : null;
	const keyboardTargetStopId = useMemo(() => {
		for (const stop of effectiveStops) {
			const bounds = getOutlineBounds(stop.outline);
			const withinBounds =
				characterPosition.x >= bounds.x - 18 &&
				characterPosition.x <= bounds.x + bounds.width + 18 &&
				characterPosition.y >= bounds.y - 18 &&
				characterPosition.y <= bounds.y + bounds.height + 18;
			const nearDoor =
				Math.hypot(
					characterPosition.x - stop.door.x,
					characterPosition.y - stop.door.y,
				) <= 46;

			if (withinBounds || nearDoor) {
				return stop.id;
			}
		}

		return null;
	}, [characterPosition, effectiveStops]);
	const focusStopId = keyboardMoving ? null : hoveredStopId ?? keyboardTargetStopId;

	const isNavigablePoint = useCallback((point: Position) => {
		const isBlocked = effectiveBlockedPolygons.some((polygon) =>
			isPointInPolygon(point, polygon),
		);
		const hasWalkablePolygons = effectiveWalkablePolygons.length > 0;
		const isWalkable =
			!hasWalkablePolygons ||
			effectiveWalkablePolygons.some((polygon) =>
				isPointInPolygon(point, polygon),
			);

		return !isBlocked && isWalkable;
	}, [effectiveBlockedPolygons, effectiveWalkablePolygons]);

	function handleEnterStop(stopId: StopId) {
		if (travelingTo || activeStopId) {
			return;
		}

		stopMovementLoop();
		pressedKeysRef.current.clear();
		setGuideOpen(false);
		const stop = getStop(effectiveStops, stopId);
		setTravelingTo(stopId);
		setCharacterVisible(true);

		runTravel(positionRef.current, stop.door, () => {
			setTravelingTo(null);
			setActiveStopId(stopId);
			setLastStopId(stopId);
			setCharacterVisible(false);
		});
	}

	function handleCloseStop() {
		if (!activeStopId) {
			return;
		}

		stopMovementLoop();
		pressedKeysRef.current.clear();
		const stop = getStop(effectiveStops, activeStopId);
		setActiveStopId(null);
		setTravelingTo(stop.id);
		setCharacterVisible(true);

		runTravel(stop.door, stop.exit, () => {
			setTravelingTo(null);
			setLastStopId(stop.id);
		});
	}

	function handleSurfaceClick(event: ReactMouseEvent<SVGSVGElement>) {
		if (dragTarget) {
			return;
		}

		const nextPoint = toMapPoint(event.clientX, event.clientY);

		if (!nextPoint) {
			return;
		}

		if (editorEnabled && devInteractionMode === "capture" && devMode !== "all") {
			addDevPoint(nextPoint);
			return;
		}

		if (editorEnabled && devInteractionMode !== "view") {
			return;
		}

		if (activeStopId || travelingTo) {
			return;
		}

		if (!isNavigablePoint(nextPoint)) {
			return;
		}

		stopMovementLoop();
		pressedKeysRef.current.clear();
		setGuideOpen(false);
		setCharacterVisible(true);
		runTravel(positionRef.current, nextPoint, () => {
			setLastStopId(null);
		});
	}

	const visibleStopId =
		editorEnabled && devInteractionMode !== "view"
			? null
			: keyboardMoving
				? travelingTo ?? activeStopId ?? null
				: hoveredStopId ?? travelingTo ?? activeStopId ?? keyboardTargetStopId ?? null;

	const trainerTransform = useMemo(
		() => `translate(${characterPosition.x - 16} ${characterPosition.y - 34})`,
		[characterPosition],
	);

	const onEscapeClose = useEffectEvent(() => {
		stopMovementLoop();
		pressedKeysRef.current.clear();

		if (activeStopId) {
			handleCloseStop();
			return;
		}

		if (devToolOpen) {
			setDevToolOpen(false);
			return;
		}

		if (guideOpen) {
			setGuideOpen(false);
		}
	});

	useEffect(() => {
		movementTickRef.current = (timestamp: number) => {
			const activeElement = document.activeElement as HTMLElement | null;
			const isTypingTarget =
				activeElement?.tagName === "INPUT" ||
				activeElement?.tagName === "TEXTAREA" ||
				activeElement?.tagName === "SELECT" ||
				activeElement?.isContentEditable;

			if (
				isTypingTarget ||
				devToolOpen ||
				guideOpen ||
				activeStopId ||
				travelingTo ||
				(editorEnabled && devInteractionMode !== "view")
			) {
				stopMovementLoop();
				return;
			}

			const keys = pressedKeysRef.current;
			if (keys.size === 0) {
				stopMovementLoop();
				return;
			}

			const lastTimestamp = movementTimestampRef.current ?? timestamp;
			const deltaMs = Math.min(timestamp - lastTimestamp, 32);
			movementTimestampRef.current = timestamp;
			const deltaSeconds = deltaMs / 1000;
			const speed = prefersReducedMotion ? 230 : 175;
			let horizontal = 0;
			let vertical = 0;

			if (keys.has("a") || keys.has("arrowleft")) {
				horizontal -= 1;
			}
			if (keys.has("d") || keys.has("arrowright")) {
				horizontal += 1;
			}
			if (keys.has("w") || keys.has("arrowup")) {
				vertical -= 1;
			}
			if (keys.has("s") || keys.has("arrowdown")) {
				vertical += 1;
			}

			if (horizontal === 0 && vertical === 0) {
				movementFrameRef.current = window.requestAnimationFrame((nextTimestamp) =>
					movementTickRef.current?.(nextTimestamp),
				);
				return;
			}

			const magnitude = Math.hypot(horizontal, vertical) || 1;
			const stepX = (horizontal / magnitude) * speed * deltaSeconds;
			const stepY = (vertical / magnitude) * speed * deltaSeconds;
			const fullCandidate = {
				x: clamp(positionRef.current.x + stepX, 0, MAP_WIDTH),
				y: clamp(positionRef.current.y + stepY, 0, MAP_HEIGHT),
			};
			let nextPoint = positionRef.current;

			if (isNavigablePoint(fullCandidate)) {
				nextPoint = fullCandidate;
			} else {
				const horizontalCandidate = {
					x: clamp(positionRef.current.x + stepX, 0, MAP_WIDTH),
					y: positionRef.current.y,
				};
				const verticalCandidate = {
					x: positionRef.current.x,
					y: clamp(positionRef.current.y + stepY, 0, MAP_HEIGHT),
				};

				if (isNavigablePoint(horizontalCandidate)) {
					nextPoint = horizontalCandidate;
				} else if (isNavigablePoint(verticalCandidate)) {
					nextPoint = verticalCandidate;
				}
			}

			if (nextPoint !== positionRef.current) {
				setCharacterVisible(true);
				setCharacterPosition(nextPoint);
				positionRef.current = nextPoint;
				setLastStopId(null);
			}

			movementFrameRef.current = window.requestAnimationFrame((nextTimestamp) =>
				movementTickRef.current?.(nextTimestamp),
			);
		};
	}, [
		activeStopId,
		devInteractionMode,
		devToolOpen,
		editorEnabled,
		guideOpen,
		isNavigablePoint,
		prefersReducedMotion,
		travelingTo,
	]);

	function startMovementLoop() {
		if (movementFrameRef.current || pressedKeysRef.current.size === 0) {
			return;
		}

		movementTimestampRef.current = null;
		setKeyboardMoving(true);
		movementFrameRef.current = window.requestAnimationFrame((timestamp) =>
			movementTickRef.current?.(timestamp),
		);
	}

	const onGlobalKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.key === "Escape") {
			onEscapeClose();
			return;
		}

		const activeElement = document.activeElement as HTMLElement | null;
		const isTypingTarget =
			activeElement?.tagName === "INPUT" ||
			activeElement?.tagName === "TEXTAREA" ||
			activeElement?.tagName === "SELECT" ||
			activeElement?.isContentEditable;

		if (
			isTypingTarget ||
			devToolOpen ||
			guideOpen ||
			activeStopId ||
			travelingTo ||
			(editorEnabled && devInteractionMode !== "view")
		) {
			return;
		}
		const key = event.key.toLowerCase();

		switch (key) {
			case "w":
			case "arrowup":
			case "s":
			case "arrowdown":
			case "a":
			case "arrowleft":
			case "d":
			case "arrowright":
				event.preventDefault();
				pressedKeysRef.current.add(key);
				startMovementLoop();
				return;
			case "f":
				if (focusStopId) {
					event.preventDefault();
					handleEnterStop(focusStopId);
				}
				return;
			default:
				return;
		}
	});

	const onGlobalKeyUp = useEffectEvent((event: KeyboardEvent) => {
		const key = event.key.toLowerCase();
		if (
			key === "w" ||
			key === "arrowup" ||
			key === "s" ||
			key === "arrowdown" ||
			key === "a" ||
			key === "arrowleft" ||
			key === "d" ||
			key === "arrowright"
		) {
			pressedKeysRef.current.delete(key);
			if (pressedKeysRef.current.size === 0) {
				stopMovementLoop();
			}
		}
	});

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => onGlobalKeyDown(event);
		const handleKeyUp = (event: KeyboardEvent) => onGlobalKeyUp(event);
		const handleBlur = () => {
			pressedKeysRef.current.clear();
			stopMovementLoop();
		};
		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		window.addEventListener("blur", handleBlur);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
			window.removeEventListener("blur", handleBlur);
		};
	}, []);

	return (
		<div className="town-page">
			<div className="town-page__chrome" />

			<main className="town-shell">
				<section className="map-panel" aria-label="Pokemon-inspired portfolio town">
					<div className="map-panel__header">
						<div className="map-panel__actions">
							<button
								type="button"
								className="route-link route-link--small"
								onClick={() => setGuideOpen(true)}
							>
								Guide
							</button>
							{editorEnabled ? (
								<button
									type="button"
									className="route-link route-link--small route-link--dev"
									onClick={() => setDevToolOpen(true)}
								>
									Map Editor
								</button>
							) : null}
						</div>
						<Link className="route-link route-link--small" href="/admin">
							Admin Route
						</Link>
					</div>

					<div className="map-frame">
						<div
							className={`map-surface ${
								editorEnabled && devInteractionMode === "capture"
									? "map-surface--capture"
									: devInteractionMode === "move"
										? "map-surface--move"
										: ""
							}`}
						>
							<Image
								className="map-image"
								src="/background.png"
								alt=""
								fill
								sizes="100vw"
								aria-hidden="true"
								priority
							/>
							<TownMapOverlay
								activeDraftPoints={activeDraftPoints}
								activePolygonKind={activePolygonKind}
								activeStopId={activeStopId}
								characterVisible={characterVisible}
								devDrafts={devDrafts}
								devInteractionMode={devInteractionMode}
								devMode={devMode}
								devRegionId={devRegionId}
								devSelectedStopId={devSelectedStopId}
								effectiveLayerVisibility={effectiveLayerVisibility}
								focusStopId={focusStopId}
								isDev={editorEnabled}
								onDragTargetChange={setDragTarget}
								onEnterStop={handleEnterStop}
								onHoverChange={setHoveredStopId}
								onSurfaceClick={handleSurfaceClick}
								showCaptureOnly={showCaptureOnly}
								showPointHandles={showPointHandles}
								stops={stops}
								svgRef={svgRef}
								trainerTransform={trainerTransform}
								visibleStopId={visibleStopId}
							/>
						</div>
					</div>
				</section>
			</main>

			{guideOpen ? (
				<div
					className="guide-backdrop"
					role="presentation"
					onClick={() => setGuideOpen(false)}
				>
					<section
						className="quest-panel quest-panel--dialog"
						role="dialog"
						aria-modal="true"
						aria-labelledby="guide-dialog-title"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="window-shell__header">
							<div>
								<p className="pixel-eyebrow">Pokemon Town Portfolio</p>
								<h2 id="guide-dialog-title">Choose your route through the work.</h2>
							</div>
							<button type="button" onClick={() => setGuideOpen(false)}>
								Close
							</button>
						</div>

						<p className="quest-panel__lede">{content.profile.intro}</p>

						<div className="status-grid">
							<div>
								<span>Current scene</span>
								<strong>{sceneLabel}</strong>
							</div>
							<div>
								<span>Mode</span>
								<strong>{instantTravel ? "Recruiter mode" : "Walk mode"}</strong>
							</div>
							{content.profile.quickStats.map((stat) => (
								<div key={stat.label}>
									<span>{stat.label}</span>
									<strong>{stat.value}</strong>
								</div>
							))}
						</div>

						<div className="toggle-card">
							<div>
								<p className="pixel-eyebrow">Travel Style</p>
								<span>Toggle between the walking tour and instant room-to-room jumps.</span>
							</div>
							<button
								type="button"
								onClick={() => setSkipTravel((current) => !current)}
								aria-pressed={skipTravel}
							>
								{skipTravel ? "On" : "Off"}
							</button>
						</div>

						<div className="route-list">
							{stops.map((stop) => (
								<button
									type="button"
									key={stop.id}
									onClick={() => handleEnterStop(stop.id)}
									disabled={Boolean(travelingTo) || Boolean(activeStopId)}
									className={stop.id === "about" ? "is-recommended" : undefined}
								>
									<span>{stop.order}</span>
									<div>
										<strong>{stop.shortLabel}</strong>
										<p className="route-list__title">{stop.title}</p>
										<p>{stop.recommendation}</p>
									</div>
								</button>
							))}
						</div>
					</section>
				</div>
			) : null}

			{activeStop ? (
				<div
					className="window-backdrop"
					role="presentation"
					onClick={handleCloseStop}
				>
					<section
						className="window-shell"
						role="dialog"
						aria-modal="true"
						aria-labelledby="town-window-title"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="window-shell__header">
							<div className="window-shell__title">
								<span className="window-shell__order">{activeStop.order}</span>
								<div>
									<p className="pixel-eyebrow">{activeStop.title}</p>
									<h2 id="town-window-title">{activeStop.shortLabel}</h2>
								</div>
							</div>
							<button type="button" onClick={handleCloseStop}>
								Close
							</button>
						</div>

						<div className="window-shell__body">
							<div className="window-shell__intro">
								<div className="window-shell__intro-copy">
									<p>{activeStop.subtitle}</p>
									<span>Current stop</span>
								</div>
								<div className="window-shell__preview-card">
									<p className="pixel-eyebrow">At A Glance</p>
									<strong>{activeStop.preview}</strong>
								</div>
							</div>

							<PortfolioStopPanel content={content} stop={activeStop} />
						</div>
					</section>
				</div>
			) : null}

			{editorEnabled ? (
				<MapDevTool
					activeRegionId={devRegionId}
					drafts={devDrafts}
					interactionMode={devInteractionMode}
					layerVisibility={devLayerVisibility}
					mode={devMode}
					onClearActive={clearActiveDraft}
					onCopyActive={copyActiveDraft}
					onCopyAll={copyAllDrafts}
					onCreatePolygonZone={createPolygonZone}
					onDeleteActivePolygonZone={deleteActivePolygonZone}
					onInteractionModeChange={setDevInteractionMode}
					onLayerVisibilityChange={updateLayerVisibility}
					onModeChange={handleDevModeChange}
					onOpenChange={setDevToolOpen}
					onUndoActive={undoDevPoint}
					open={devToolOpen}
					stops={stops}
					selectedStopId={devSelectedStopId}
					setActiveRegionId={setDevRegionId}
					setSelectedStopId={setDevSelectedStopId}
				/>
			) : null}
		</div>
	);
}
