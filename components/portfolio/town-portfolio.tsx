"use client";

import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
	defaultTownMapBackgroundId,
	getTownMapVariant,
	type PortfolioContent,
	type Position,
	type StopId,
	type TownMapBackgroundId,
	type TownStop,
	townMapVariants,
} from "@/lib/portfolio-content";
import {
	createSeedDevDrafts,
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

const ACTIVE_BACKGROUND_STORAGE_KEY = "pokemon-town-active-background";
const DEV_DRAFT_STORAGE_KEY = "pokemon-town-dev-drafts";
const EMPTY_STOP_POSITION: Position = { x: -9999, y: -9999 };

function getDraftStorageKey(backgroundId: TownMapBackgroundId) {
	return `${DEV_DRAFT_STORAGE_KEY}:${backgroundId}`;
}

function isTownMapBackgroundId(value: string | null): value is TownMapBackgroundId {
	return townMapVariants.some((background) => background.id === value);
}

function isUnsetPosition(position: Position) {
	return position.x < 0 || position.y < 0;
}

function getCameraFrame({
	mapHeight,
	mapWidth,
	position,
	viewportHeight,
	viewportWidth,
}: {
	mapHeight: number;
	mapWidth: number;
	position: Position;
	viewportHeight: number;
	viewportWidth: number;
}) {
	const scale = Math.max(
		viewportWidth / mapWidth,
		viewportHeight / mapHeight,
	);
	const sceneWidth = mapWidth * scale;
	const sceneHeight = mapHeight * scale;
	const x = clamp(
		viewportWidth / 2 - position.x * scale,
		viewportWidth - sceneWidth,
		0,
	);
	const y = clamp(
		viewportHeight / 2 - position.y * scale,
		viewportHeight - sceneHeight,
		0,
	);

	return { scale, x, y };
}

export function TownPortfolio({
	content,
	stops,
}: {
	content: PortfolioContent;
	stops: TownStop[];
}) {
	const editorEnabled = true;
	const defaultMapVariant = getTownMapVariant(defaultTownMapBackgroundId);
	const [activeBackgroundId, setActiveBackgroundId] =
		useState<TownMapBackgroundId>(defaultTownMapBackgroundId);
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
	const [devDrafts, setDevDrafts] = useState<DevMapDrafts>(() =>
		createSeedDevDrafts(defaultTownMapBackgroundId),
	);
	const [draftsHydrated, setDraftsHydrated] = useState(false);
	const [characterPosition, setCharacterPosition] = useState<Position>(
		defaultMapVariant.startPosition,
	);
	const [activeStopId, setActiveStopId] = useState<StopId | null>(null);
	const [travelingTo, setTravelingTo] = useState<StopId | null>(null);
	const [characterVisible, setCharacterVisible] = useState(true);
	const [skipTravel, setSkipTravel] = useState(false);
	const [lastStopId, setLastStopId] = useState<StopId | null>(null);
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
	const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
	const [keyboardMoving, setKeyboardMoving] = useState(false);
	const [proximitySuppressed, setProximitySuppressed] = useState(false);
	const [facing, setFacing] = useState<"up" | "down" | "left" | "right">("down");
	const [viewportSize, setViewportSize] = useState(() => ({
		width: typeof window === "undefined" ? defaultMapVariant.width : window.innerWidth,
		height:
			typeof window === "undefined" ? defaultMapVariant.height : window.innerHeight,
	}));
	const activeMapVariant = useMemo(
		() => getTownMapVariant(activeBackgroundId),
		[activeBackgroundId],
	);

	const travelFrameRef = useRef<number | null>(null);
	const movementFrameRef = useRef<number | null>(null);
	const movementTimestampRef = useRef<number | null>(null);
	const movementTickRef = useRef<((timestamp: number) => void) | null>(null);
	const pressedKeysRef = useRef<Set<string>>(new Set());
	const positionRef = useRef(defaultMapVariant.startPosition);
	const svgRef = useRef<SVGSVGElement | null>(null);
	const viewportRef = useRef<HTMLDivElement | null>(null);
	const seedLayoutEnabled = activeBackgroundId === defaultTownMapBackgroundId;
	const baseStops = useMemo(
		() =>
			seedLayoutEnabled
				? stops
				: stops.map((stop) => ({
						...stop,
						outline: [],
						infoAnchor: EMPTY_STOP_POSITION,
						door: EMPTY_STOP_POSITION,
						exit: EMPTY_STOP_POSITION,
					})),
		[seedLayoutEnabled, stops],
	);
	const effectiveStops = useMemo(
		() =>
			baseStops.map((stop) => {
				const draft = devDrafts.stops[stop.id];

				return {
					...stop,
					outline: draft?.outline ?? stop.outline,
					infoAnchor: draft?.infoAnchor ?? stop.infoAnchor,
					door: draft?.door ?? stop.door,
					exit: draft?.exit ?? stop.exit,
				};
			}),
		[baseStops, devDrafts.stops],
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
		const savedBackground = window.localStorage.getItem(
			ACTIVE_BACKGROUND_STORAGE_KEY,
		);

		if (isTownMapBackgroundId(savedBackground)) {
			setActiveBackgroundId(savedBackground);
		}
	}, []);

	useEffect(() => {
		const frame = window.requestAnimationFrame(() => {
			const nextStartPosition = activeMapVariant.startPosition;
			const primaryStorageKey = getDraftStorageKey(activeBackgroundId);
			const legacyDrafts =
				activeBackgroundId === defaultTownMapBackgroundId
					? window.localStorage.getItem(DEV_DRAFT_STORAGE_KEY)
					: null;
			const rawDrafts =
				window.localStorage.getItem(primaryStorageKey) ?? legacyDrafts;

			clearTimer();
			stopMovementLoop();
			pressedKeysRef.current.clear();
			setDragTarget(null);
			setHoveredStopId(null);
			setActiveStopId(null);
			setTravelingTo(null);
			setLastStopId(null);
			setCharacterVisible(true);
			setProximitySuppressed(false);
			setCharacterPosition(nextStartPosition);
			positionRef.current = nextStartPosition;
			setDevDrafts(createSeedDevDrafts(activeBackgroundId));
			setDraftsHydrated(false);

			if (!rawDrafts) {
				window.localStorage.setItem(ACTIVE_BACKGROUND_STORAGE_KEY, activeBackgroundId);
				setDraftsHydrated(true);
				return;
			}

			try {
				setDevDrafts(JSON.parse(rawDrafts) as DevMapDrafts);
			} catch {
				window.localStorage.removeItem(primaryStorageKey);
				if (legacyDrafts) {
					window.localStorage.removeItem(DEV_DRAFT_STORAGE_KEY);
				}
			}

			if (
				legacyDrafts &&
				!window.localStorage.getItem(primaryStorageKey)
			) {
				window.localStorage.setItem(primaryStorageKey, rawDrafts);
			}

			window.localStorage.setItem(ACTIVE_BACKGROUND_STORAGE_KEY, activeBackgroundId);
			setDraftsHydrated(true);
		});

		return () => window.cancelAnimationFrame(frame);
	}, [activeBackgroundId, activeMapVariant.startPosition]);

	useEffect(() => {
		if (!draftsHydrated) {
			return;
		}

		window.localStorage.setItem(
			getDraftStorageKey(activeBackgroundId),
			JSON.stringify(devDrafts),
		);
	}, [activeBackgroundId, devDrafts, draftsHydrated]);

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

	useLayoutEffect(() => {
		const element = viewportRef.current;

		if (!element) {
			return;
		}

		const syncViewport = () => {
			setViewportSize({
				width: element.clientWidth,
				height: element.clientHeight,
			});
		};

		syncViewport();
		const observer = new ResizeObserver(syncViewport);
		observer.observe(element);

		return () => observer.disconnect();
	}, []);

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

	function runTravel(points: Position[], onDone: () => void) {
		clearTimer();
		
		if (points.length === 0) {
			onDone();
			return;
		}

		if (instantTravel) {
			const finalPoint = points[points.length - 1];
			setCharacterPosition(finalPoint);
			positionRef.current = finalPoint;
			onDone();
			return;
		}

		let currentPointIndex = 0;
		let startedAt: number | null = null;

		const step = (timestamp: number) => {
			if (startedAt === null) {
				startedAt = timestamp;
			}

			const start = points[currentPointIndex];
			const end = points[currentPointIndex + 1];

			if (!end) {
				travelFrameRef.current = null;
				onDone();
				return;
			}

			const distance = Math.hypot(end.x - start.x, end.y - start.y);
			const duration = clamp(Math.round(distance * 3.2), 50, 2000);
			
			const progress = Math.min((timestamp - startedAt) / duration, 1);
			const nextPosition = {
				x: start.x + (end.x - start.x) * progress,
				y: start.y + (end.y - start.y) * progress,
			};

			setCharacterPosition(nextPosition);
			positionRef.current = nextPosition;
			setProximitySuppressed(false);

			// Determine facing based on segment direction
			const dx = end.x - start.x;
			const dy = end.y - start.y;
			if (Math.abs(dx) > Math.abs(dy)) {
				setFacing(dx > 0 ? "right" : "left");
			} else if (Math.abs(dy) > 0.1) {
				setFacing(dy > 0 ? "down" : "up");
			}

			if (progress < 1) {
				travelFrameRef.current = window.requestAnimationFrame(step);
			} else {
				currentPointIndex++;
				if (currentPointIndex < points.length - 1) {
					startedAt = timestamp;
					travelFrameRef.current = window.requestAnimationFrame(step);
				} else {
					travelFrameRef.current = null;
					onDone();
				}
			}
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
			x: clamp(nextPoint.x, 0, activeMapVariant.width),
			y: clamp(nextPoint.y, 0, activeMapVariant.height),
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

	function handleBackgroundChange(nextBackgroundId: TownMapBackgroundId) {
		if (nextBackgroundId === activeBackgroundId) {
			return;
		}

		const nextMapVariant = getTownMapVariant(nextBackgroundId);

		clearTimer();
		stopMovementLoop();
		pressedKeysRef.current.clear();
		setDragTarget(null);
		setHoveredStopId(null);
		setActiveStopId(null);
		setTravelingTo(null);
		setLastStopId(null);
		setCharacterVisible(true);
		setProximitySuppressed(false);
		setCharacterPosition(nextMapVariant.startPosition);
		positionRef.current = nextMapVariant.startPosition;
		setDevDrafts(createSeedDevDrafts(nextBackgroundId));
		setDraftsHydrated(false);
		setActiveBackgroundId(nextBackgroundId);
	}

	function resetActiveBackgroundDrafts() {
		const nextMapVariant = getTownMapVariant(activeBackgroundId);

		window.localStorage.removeItem(getDraftStorageKey(activeBackgroundId));
		if (activeBackgroundId === defaultTownMapBackgroundId) {
			window.localStorage.removeItem(DEV_DRAFT_STORAGE_KEY);
		}

		clearTimer();
		stopMovementLoop();
		pressedKeysRef.current.clear();
		setDragTarget(null);
		setHoveredStopId(null);
		setActiveStopId(null);
		setTravelingTo(null);
		setLastStopId(null);
		setCharacterVisible(true);
		setProximitySuppressed(false);
		setCharacterPosition(nextMapVariant.startPosition);
		positionRef.current = nextMapVariant.startPosition;
		setDevDrafts(createSeedDevDrafts(activeBackgroundId));
		setDraftsHydrated(true);
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
		const baseStop = getStop(baseStops, stopId);
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

		const stop = getStop(baseStops, devSelectedStopId);
		const draft = devDrafts.stops[devSelectedStopId];

		return {
			outline: draft?.outline ?? stop.outline,
			infoAnchor: draft?.infoAnchor ?? stop.infoAnchor,
			door: draft?.door ?? stop.door,
			exit: draft?.exit ?? stop.exit,
		};
	}, [baseStops, devDrafts.stops, devMode, devSelectedStopId]);

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
			if (stop.outline.length < 3 || isUnsetPosition(stop.door)) {
				continue;
			}

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
	const focusStopId = keyboardMoving 
		? null 
		: hoveredStopId ?? (proximitySuppressed ? null : keyboardTargetStopId);

	const isNavigablePoint = useCallback((point: Position, ignoreStopId?: StopId | null) => {
		// 1. Check building outlines (They are blocked areas)
		const isInsideBuilding = effectiveStops.some(stop => {
			if (stop.outline.length < 3) return false;
			if (stop.id === ignoreStopId) return false;
			const bounds = getOutlineBounds(stop.outline);
			// Add a small buffer around buildings
			return (
				point.x >= bounds.x - 4 &&
				point.x <= bounds.x + bounds.width + 4 &&
				point.y >= bounds.y - 4 &&
				point.y <= bounds.y + bounds.height + 4
			);
		});

		if (isInsideBuilding) {
			// Exception: if the character is very close to a door, allow it
			const nearAnyDoor = effectiveStops.some(stop => 
				!isUnsetPosition(stop.door) &&
				Math.hypot(point.x - stop.door.x, point.y - stop.door.y) <= 20
			);
			if (!nearAnyDoor) return false;
		}

		// 2. Check explicit blocked polygons from dev drafts
		const isBlocked = effectiveBlockedPolygons.some((polygon) =>
			isPointInPolygon(point, polygon),
		);
		if (isBlocked) return false;

		// 3. Check if inside any walkable zone (base zones or dev drafts)
		const inBaseWalkZone = activeMapVariant.walkZones.some(zone => 
			point.x >= zone.x && point.x <= zone.x + zone.width &&
			point.y >= zone.y && point.y <= zone.y + zone.height
		);

		const inDraftWalkZone = effectiveWalkablePolygons.some((polygon) =>
			isPointInPolygon(point, polygon),
		);

		// Must be in at least one walkable area
		return inBaseWalkZone || inDraftWalkZone;
	}, [
		activeMapVariant.walkZones,
		effectiveBlockedPolygons,
		effectiveWalkablePolygons,
		effectiveStops,
	]);

	const findPath = useCallback((start: Position, end: Position, targetStopId?: StopId | null): Position[] => {
		const gridSize = 12; // More granular for better navigation
		const startX = Math.floor(start.x / gridSize);
		const startY = Math.floor(start.y / gridSize);
		const endX = Math.floor(end.x / gridSize);
		const endY = Math.floor(end.y / gridSize);

		if (startX === endX && startY === endY) {
			return [start, end];
		}

		const queue: [number, number][] = [[startX, startY]];
		const parentMap = new Map<string, [number, number]>();
		const visited = new Set<string>();
		const startKey = `${startX},${startY}`;
		visited.add(startKey);

		let reached = false;
		// Limit search to prevent hangs
		let iterations = 0;
		const maxIterations = 3000;

		while (queue.length > 0 && iterations < maxIterations) {
			iterations++;
			const [cx, cy] = queue.shift()!;
			
			// If we are close enough to the target grid cell
			if (Math.abs(cx - endX) <= 1 && Math.abs(cy - endY) <= 1) {
				reached = true;
				break;
			}

			const neighbors = [
				[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1],
				[cx + 1, cy + 1], [cx - 1, cy - 1], [cx + 1, cy - 1], [cx - 1, cy + 1]
			];

			for (const [nx, ny] of neighbors) {
				const key = `${nx},${ny}`;
				if (
					nx < 0 ||
					ny < 0 ||
					nx * gridSize > activeMapVariant.width ||
					ny * gridSize > activeMapVariant.height
				) continue;
				if (visited.has(key)) continue;

				const testPoint = { x: nx * gridSize + gridSize / 2, y: ny * gridSize + gridSize / 2 };
				if (isNavigablePoint(testPoint, targetStopId)) {
					visited.add(key);
					parentMap.set(key, [cx, cy]);
					queue.push([nx, ny]);
				}
			}
		}

		if (!reached) {
			return [start, end];
		}

		// Reconstruct path
		const path: Position[] = [end];
		
		// Find the actual parent of the reached target
		let targetKey = "";
		const reachNeighbors = [[endX, endY], [endX+1, endY], [endX-1, endY], [endX, endY+1], [endX, endY-1]];
		for (const [tx, ty] of reachNeighbors) {
			if (parentMap.has(`${tx},${ty}`)) {
				targetKey = `${tx},${ty}`;
				break;
			}
		}

		if (!targetKey) return [start, end];

		let currCoords: [number, number] = targetKey.split(',').map(Number) as [number, number];
		while (parentMap.has(`${currCoords[0]},${currCoords[1]}`)) {
			path.unshift({ x: currCoords[0] * gridSize + gridSize / 2, y: currCoords[1] * gridSize + gridSize / 2 });
			currCoords = parentMap.get(`${currCoords[0]},${currCoords[1]}`)!;
		}

		path.unshift(start);

		// Simple path smoothing
		if (path.length > 2) {
			for (let i = 0; i < path.length - 2; i++) {
				const p1 = path[i];
				const p2 = path[i + 2];
				
				const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
				if (isNavigablePoint(mid, targetStopId)) {
					path.splice(i + 1, 1);
					i--; 
				}
			}
		}

		return path;
	}, [activeMapVariant.height, activeMapVariant.width, isNavigablePoint]);

	function handleEnterStop(stopId: StopId) {
		if (travelingTo || activeStopId) {
			return;
		}

		stopMovementLoop();
		pressedKeysRef.current.clear();
		setGuideOpen(false);
		const stop = getStop(effectiveStops, stopId);
		if (stop.outline.length < 3 || isUnsetPosition(stop.door)) {
			return;
		}
		setTravelingTo(stopId);
		setCharacterVisible(true);

		const path = findPath(positionRef.current, stop.door, stopId);

		runTravel(path, () => {
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
		if (isUnsetPosition(stop.door) || isUnsetPosition(stop.exit)) {
			setActiveStopId(null);
			setTravelingTo(null);
			return;
		}
		setActiveStopId(null);
		setTravelingTo(stop.id);
		setCharacterVisible(true);

		const path = findPath(stop.door, stop.exit);

		runTravel(path, () => {
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

		const path = findPath(positionRef.current, nextPoint);

		runTravel(path, () => {
			setLastStopId(null);
		});
	}

	const handleHoverChange = useCallback((stopId: StopId | null) => {
		setHoveredStopId(stopId);
		if (stopId !== null) {
			setProximitySuppressed(true);
		}
	}, []);

	const visibleStopId =
		editorEnabled && devInteractionMode !== "view"
			? null
			: travelingTo ?? activeStopId ?? focusStopId;

	const trainerTransform = useMemo(
		() => `translate(${characterPosition.x - 16} ${characterPosition.y - 34})`,
		[characterPosition],
	);
	const cameraFrame = useMemo(
		() =>
			getCameraFrame({
				mapHeight: activeMapVariant.height,
				mapWidth: activeMapVariant.width,
				position: characterPosition,
				viewportHeight: viewportSize.height || activeMapVariant.height,
				viewportWidth: viewportSize.width || activeMapVariant.width,
			}),
		[
			activeMapVariant.height,
			activeMapVariant.width,
			characterPosition,
			viewportSize.height,
			viewportSize.width,
		],
	);
	const sceneTransform = useMemo(
		() =>
			`translate3d(${cameraFrame.x}px, ${cameraFrame.y}px, 0) scale(${cameraFrame.scale})`,
		[cameraFrame.scale, cameraFrame.x, cameraFrame.y],
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

			if (horizontal !== 0) {
				setFacing(horizontal > 0 ? "right" : "left");
			} else if (vertical !== 0) {
				setFacing(vertical > 0 ? "down" : "up");
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
				x: clamp(positionRef.current.x + stepX, 0, activeMapVariant.width),
				y: clamp(positionRef.current.y + stepY, 0, activeMapVariant.height),
			};
			let nextPoint = positionRef.current;

			if (isNavigablePoint(fullCandidate)) {
				nextPoint = fullCandidate;
			} else {
				const horizontalCandidate = {
					x: clamp(positionRef.current.x + stepX, 0, activeMapVariant.width),
					y: positionRef.current.y,
				};
				const verticalCandidate = {
					x: positionRef.current.x,
					y: clamp(positionRef.current.y + stepY, 0, activeMapVariant.height),
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
				setProximitySuppressed(false);
			}

			movementFrameRef.current = window.requestAnimationFrame((nextTimestamp) =>
				movementTickRef.current?.(nextTimestamp),
			);
		};
	}, [
		activeMapVariant.height,
		activeMapVariant.width,
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
		<div className="relative min-h-screen overflow-hidden">
			<div className="town-page__chrome fixed inset-0 z-50 pointer-events-none" />

			<main className="relative z-10 h-screen w-screen overflow-hidden">
				<section className="h-full w-full bg-transparent" aria-label="Pokemon-inspired portfolio town">
					<div className="pointer-events-none absolute right-6 left-6 top-6 z-20 flex items-center justify-between gap-4">
						<div className="pointer-events-auto flex items-center gap-4">
							<button
								type="button"
								className="pixel-button text-sm"
								onClick={() => setGuideOpen(true)}
							>
								Guide
							</button>
							<label className="pixel-card pointer-events-auto flex items-center gap-3 bg-white/85 px-4 py-2">
								<span className="font-dot-gothic text-xs uppercase tracking-wider text-ink-soft">
									Background
								</span>
								<select
									className="bg-transparent font-dot-gothic text-sm outline-none"
									value={activeBackgroundId}
									onChange={(event) =>
										handleBackgroundChange(
											event.target.value as TownMapBackgroundId,
										)
									}
								>
									{townMapVariants.map((background) => (
										<option key={background.id} value={background.id}>
											{background.label}
										</option>
									))}
								</select>
							</label>
							{editorEnabled ? (
								<button
									type="button"
									className="pixel-button bg-sky text-sm"
									onClick={() => setDevToolOpen(true)}
								>
									Map Editor
								</button>
							) : null}
						</div>
						<Link className="pixel-button pointer-events-auto text-sm" href="/admin">
							Admin Route
						</Link>
					</div>

					<div
						ref={viewportRef}
						className="relative flex h-full w-full items-center justify-center overflow-hidden bg-transparent"
					>
						<div
							className={`map-surface-scanlines map-scene absolute left-0 top-0 overflow-hidden ${
								editorEnabled && devInteractionMode === "capture"
									? "cursor-crosshair"
									: devInteractionMode === "move"
										? "cursor-grab"
										: ""
							}`}
							style={{
								height: activeMapVariant.height,
								transform: sceneTransform,
								transformOrigin: "top left",
								width: activeMapVariant.width,
							}}
						>
							<Image
								className="map-image"
								src={activeMapVariant.imageSrc}
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
								facing={facing}
								focusStopId={focusStopId}
								isDev={editorEnabled}
								mapHeight={activeMapVariant.height}
								mapWidth={activeMapVariant.width}
								onDragTargetChange={setDragTarget}
								onEnterStop={handleEnterStop}
								onHoverChange={handleHoverChange}
								onSurfaceClick={handleSurfaceClick}
								showCaptureOnly={showCaptureOnly}
								showPointHandles={showPointHandles}
								stops={baseStops}
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
					className="fixed inset-0 z-20 grid place-items-center bg-black/40 p-6 backdrop-blur-sm"
					role="presentation"
					onClick={() => setGuideOpen(false)}
				>
					<section
						className="pokedex-box flex w-[min(720px,calc(100vw-2rem))] max-w-full max-h-[min(90vh,900px)] flex-col gap-6 overflow-x-hidden overflow-y-auto p-8 scrollbar-thin"
						role="dialog"
						aria-modal="true"
						aria-labelledby="guide-dialog-title"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="flex items-center justify-between gap-4">
							<div>
								<p className="pixel-eyebrow">Pokemon Town Portfolio</p>
								<h2 className="m-0 font-dot-gothic text-2xl leading-tight" id="guide-dialog-title">Choose your route through the work.</h2>
							</div>
							<button className="pixel-button px-4 py-2 text-sm" type="button" onClick={() => setGuideOpen(false)}>
								Close
							</button>
						</div>

						<p className="m-0 text-2xl leading-tight">
							{content.profile.intro}
							<span className="pixel-arrow">▼</span>
						</p>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div className="pixel-card flex min-w-0 flex-col gap-1 bg-white/80 p-4">
								<span className="font-dot-gothic text-xs uppercase tracking-wider text-ink-soft">Current scene</span>
								<strong className="truncate text-xl leading-tight">{sceneLabel}</strong>
							</div>
							<div className="pixel-card flex min-w-0 flex-col gap-1 bg-white/80 p-4">
								<span className="font-dot-gothic text-xs uppercase tracking-wider text-ink-soft">Mode</span>
								<strong className="truncate text-xl leading-tight">{instantTravel ? "Recruiter mode" : "Walk mode"}</strong>
							</div>
							{content.profile.quickStats.map((stat) => (
								<div className="pixel-card flex min-w-0 flex-col gap-1 bg-white/80 p-4" key={stat.label}>
									<span className="font-dot-gothic text-xs uppercase tracking-wider text-ink-soft">{stat.label}</span>
									<strong className="truncate text-xl leading-tight">{stat.value}</strong>
								</div>
							))}
						</div>

						<div className="flex flex-col gap-4 border-t border-line/10 pt-6">
							<div className="flex items-center justify-between gap-4">
								<p className="pixel-eyebrow">Settings</p>
							</div>
							<div className="pixel-card flex min-w-0 box-border items-center justify-between gap-4 bg-white/40 p-4">
								<div className="flex min-w-0 flex-1 flex-col gap-1">
									<strong className="truncate text-lg leading-tight">Instant Travel</strong>
									<span className="font-dot-gothic text-xs text-ink-soft">Skip walking transitions between stops</span>
								</div>
								<button
									type="button"
									className={`pixel-button px-4 py-2 text-sm transition-colors ${instantTravel ? 'bg-accent' : 'bg-white'}`}
									onClick={() => setSkipTravel(!skipTravel)}
								>
									{instantTravel ? "Enabled" : "Disabled"}
								</button>
							</div>
						</div>

						<div className="grid gap-4 pt-4">
							{stops.map((stop) => {
								const isCurrent = activeStopId === stop.id;
								const isRecommended = stop.id === "about" || stop.id === "projects";
								const effectiveStop = getStop(effectiveStops, stop.id);
								const hasMappedStop =
									effectiveStop.outline.length >= 3 &&
									!isUnsetPosition(effectiveStop.door);

								return (
									<button
										key={stop.id}
										type="button"
										className={`group flex min-w-0 box-border items-center gap-5 border-4 p-4 text-left transition-all ${
											!hasMappedStop
												? "cursor-not-allowed border-line-soft/10 bg-white/40 opacity-50"
												: isCurrent
												? "border-line bg-accent shadow-[4px_4px_0_rgba(0,0,0,0.1)]"
												: isRecommended
													? "border-accent-strong/40 bg-accent/10 hover:bg-accent/20"
													: "border-line-soft/10 bg-white/60 hover:bg-white"
										}`}
										disabled={!hasMappedStop}
										onClick={() => {
											handleEnterStop(stop.id);
											setGuideOpen(false);
										}}
									>
										<span className={`flex h-14 w-14 shrink-0 items-center justify-center border-4 border-line font-dot-gothic text-xl ${isCurrent ? 'bg-white' : 'bg-sky'}`}>
											{stop.order}
										</span>
										<div className="flex min-w-0 flex-1 flex-col gap-1">
											<div className="flex items-center gap-3">
												<strong className="truncate text-xl leading-tight">{stop.title}</strong>
												{isRecommended && (
													<span className="shrink-0 bg-accent-strong px-2 py-0.5 font-dot-gothic text-[10px] uppercase text-white">
														Recommended
													</span>
												)}
											</div>
											<p className="m-0 truncate text-lg leading-tight text-ink-soft">{stop.preview}</p>
										</div>
										<span className="ml-auto opacity-0 transition-opacity group-hover:opacity-100 font-dot-gothic text-xl text-accent-strong animate-pixel-blink">▶</span>
									</button>
								);
							})}
						</div>
					</section>
				</div>
			) : null}

			{activeStop && !guideOpen ? (
				<div
					className="fixed inset-0 z-20 grid place-items-center bg-black/40 p-6 backdrop-blur-md"
					role="presentation"
					onClick={handleCloseStop}
				>
					<section
						className="pokedex-box flex w-[min(1360px,calc(100vw-2rem))] max-h-[min(92vh,980px)] flex-col overflow-hidden p-8"
						role="dialog"
						aria-modal="true"
						aria-labelledby="town-window-title"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="flex flex-col gap-4 border-b border-line/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-center gap-5">
								<div className="flex h-16 w-14 shrink-0 items-center justify-center border-4 border-line bg-sky font-dot-gothic text-2xl shadow-pixel">
									{activeStop.order}
								</div>
								<div>
									<p className="pixel-eyebrow">{activeStop.title}</p>
									<h2 className="m-0 font-dot-gothic text-3xl leading-tight" id="town-window-title">{activeStop.shortLabel}</h2>
								</div>
							</div>
							<button className="pixel-button px-6 py-3 text-lg" type="button" onClick={handleCloseStop}>
								Close Room
							</button>
						</div>

						<div className="flex-1 min-h-0 overflow-auto pr-2 pt-8 scrollbar-thin">
							<div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-[1fr_320px]">
								<div className="pixel-card flex flex-col gap-1 border-line-soft/10 bg-white/60 p-5">
									<p className="m-0 text-2xl leading-tight text-ink">{activeStop.subtitle}</p>
									<span className="font-dot-gothic text-xs uppercase tracking-widest text-ink-soft">Current stop</span>
								</div>
								<div className="pixel-card flex flex-col gap-2 bg-accent p-5 shadow-pixel">
									<p className="pixel-eyebrow text-xs!">At A Glance</p>
									<strong className="text-xl leading-tight">{activeStop.preview}</strong>
								</div>
							</div>

							<PortfolioStopPanel content={content} stop={activeStop} />
						</div>
					</section>
				</div>
			) : null}

			{editorEnabled ? (
				<MapDevTool
					activeBackgroundId={activeBackgroundId}
					activeRegionId={devRegionId}
					backgrounds={townMapVariants.map((background) => ({
						id: background.id,
						label: background.label,
					}))}
					drafts={devDrafts}
					interactionMode={devInteractionMode}
					layerVisibility={devLayerVisibility}
					mode={devMode}
					onBackgroundChange={handleBackgroundChange}
					onClearActive={clearActiveDraft}
					onCopyActive={copyActiveDraft}
					onCopyAll={copyAllDrafts}
					onCreatePolygonZone={createPolygonZone}
					onDeleteActivePolygonZone={deleteActivePolygonZone}
					onInteractionModeChange={setDevInteractionMode}
					onLayerVisibilityChange={updateLayerVisibility}
					onModeChange={handleDevModeChange}
					onOpenChange={setDevToolOpen}
					onResetBackground={resetActiveBackgroundDrafts}
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
