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
import {
	OVERWORLD_AMBIENT_SPRITES,
	TownMapOverlay,
	type AmbientSpriteActor,
	type FacingDirection,
} from "./town-map-overlay";
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
const SHOW_LEGACY_BACKGROUND_STORAGE_KEY = "pokemon-town-show-legacy-background";
const EMPTY_STOP_POSITION: Position = { x: -9999, y: -9999 };
const LEGACY_BACKGROUND_ID: TownMapBackgroundId = "background";

function getDraftStorageKey(backgroundId: TownMapBackgroundId) {
	return `${DEV_DRAFT_STORAGE_KEY}:${backgroundId}`;
}

function isTownMapBackgroundId(value: string | null): value is TownMapBackgroundId {
	return townMapVariants.some((background) => background.id === value);
}

function isLegacyBackgroundEnabled(value: string | null) {
	return value === "true";
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

function getDistanceToSegment(point: Position, start: Position, end: Position) {
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const lengthSquared = dx * dx + dy * dy;

	if (lengthSquared === 0) {
		return Math.hypot(point.x - start.x, point.y - start.y);
	}

	const projection = clamp(
		((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
		0,
		1,
	);
	const projectedPoint = {
		x: start.x + dx * projection,
		y: start.y + dy * projection,
	};

	return Math.hypot(point.x - projectedPoint.x, point.y - projectedPoint.y);
}

function mergeTravelPaths(...segments: Position[][]) {
	const merged: Position[] = [];

	for (const segment of segments) {
		if (segment.length === 0) {
			continue;
		}

		if (merged.length === 0) {
			merged.push(...segment);
			continue;
		}

		const lastPoint = merged[merged.length - 1];
		const [firstPoint, ...restPoints] = segment;
		if (Math.hypot(firstPoint.x - lastPoint.x, firstPoint.y - lastPoint.y) > 0.01) {
			merged.push(firstPoint);
		}
		merged.push(...restPoints);
	}

	return merged;
}

type AmbientActorState = AmbientSpriteActor & {
	conversationCooldownRemainingMs: number;
	conversationPartnerId: string | null;
	conversationRemainingMs: number;
	emoteAnimationMs: number;
	emoteRemainingMs: number;
	path: Position[];
	playerInteractionCooldownRemainingMs: number;
	playerInteractionRemainingMs: number;
};

const STATIC_AMBIENT_ACTOR_IDS = new Set<string>();

function getFacingFromRow(row = 0): FacingDirection {
	if (row === 1) {
		return "left";
	}

	if (row === 2) {
		return "up";
	}

	if (row === 3) {
		return "right";
	}

	return "down";
}

function getFacingFromVector(dx: number, dy: number): FacingDirection {
	if (Math.abs(dx) > Math.abs(dy)) {
		return dx >= 0 ? "right" : "left";
	}

	return dy >= 0 ? "down" : "up";
}

function isStaticAmbientActor(actorId: string) {
	return STATIC_AMBIENT_ACTOR_IDS.has(actorId);
}

function isConversationalAmbientActor(actorId: string) {
	return !isStaticAmbientActor(actorId) && !actorId.startsWith("creature");
}

function getAmbientSpeedRange(actorId: string) {
	if (actorId.startsWith("creature")) {
		return { min: 24, max: 40 };
	}

	return { min: 32, max: 56 };
}

function getAmbientRoamRadius(actorId: string) {
	if (actorId.startsWith("creature")) {
		return 58;
	}

	if (actorId.startsWith("snpc")) {
		return 72;
	}

	return 88;
}

function getAmbientIdleDurationMs(actorId: string) {
	if (actorId.startsWith("creature")) {
		return 400 + Math.random() * 1000;
	}

	return 700 + Math.random() * 1800;
}

function getAmbientEmoteDurationMs(actorId: string) {
	if (actorId.startsWith("creature")) {
		return 3800 + Math.random() * 2400;
	}

	return 4200 + Math.random() * 3200;
}

function getAmbientPostEmoteIdleMs(actorId: string) {
	if (actorId.startsWith("creature")) {
		return 320 + Math.random() * 380;
	}

	return 480 + Math.random() * 520;
}

function getCharacterTravelSpeed(prefersReducedMotion: boolean) {
	return prefersReducedMotion ? 260 : 205;
}

function getAmbientFeetPosition(actor: Pick<AmbientActorState, "position" | "renderHeight" | "renderWidth">): Position {
	return {
		x: actor.position.x + actor.renderWidth / 2,
		y: actor.position.y + actor.renderHeight - 4,
	};
}

function getAmbientPositionFromFeet(
	feet: Position,
	actor: Pick<AmbientActorState, "renderHeight" | "renderWidth">,
): Position {
	return {
		x: feet.x - actor.renderWidth / 2,
		y: feet.y - actor.renderHeight + 4,
	};
}

function createAmbientActors(backgroundId: TownMapBackgroundId): AmbientActorState[] {
	if (backgroundId !== defaultTownMapBackgroundId) {
		return [];
	}

	return OVERWORLD_AMBIENT_SPRITES.map((sprite) => {
		const speedRange = getAmbientSpeedRange(sprite.id);

		return {
			...sprite,
			conversationCooldownRemainingMs: 0,
			conversationPartnerId: null,
			conversationRemainingMs: 0,
			emoteAnimationMs: 0,
			emoteRemainingMs: sprite.defaultEmoteVisible ? 3200 : 0,
			emoteVisible: Boolean(sprite.defaultEmoteVisible),
			facing: getFacingFromRow(sprite.row),
			idleRemainingMs: isStaticAmbientActor(sprite.id)
				? 0
				: getAmbientIdleDurationMs(sprite.id),
			moving: false,
			path: [],
			playerInteractionCooldownRemainingMs: 0,
			playerInteractionRemainingMs: 0,
			position: { x: sprite.x, y: sprite.y },
			spawn: { x: sprite.x, y: sprite.y },
			speed:
				speedRange.min + Math.random() * (speedRange.max - speedRange.min),
			target: null,
		};
	});
}

export function TownPortfolio({
	content,
	stops,
}: {
	content: PortfolioContent;
	stops: TownStop[];
}) {
	const ambientSpriteSeed = OVERWORLD_AMBIENT_SPRITES.map((sprite) => sprite.id).join("|");
	const ambientSpriteIds = new Set(OVERWORLD_AMBIENT_SPRITES.map((sprite) => sprite.id));
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
	const [exitPassThroughStopId, setExitPassThroughStopId] = useState<StopId | null>(null);
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
	const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
	const [keyboardMoving, setKeyboardMoving] = useState(false);
	const [pathMoving, setPathMoving] = useState(false);
	const [proximitySuppressed, setProximitySuppressed] = useState(false);
	const [facing, setFacing] = useState<"up" | "down" | "left" | "right">("down");
	const [cameraReady, setCameraReady] = useState(false);
	const [showLegacyBackground, setShowLegacyBackground] = useState(false);
	const [spriteTick, setSpriteTick] = useState(0);
	const [ambientActors, setAmbientActors] = useState<AmbientActorState[]>(() =>
		createAmbientActors(defaultTownMapBackgroundId),
	);
	const [viewportSize, setViewportSize] = useState(() => ({
		width: defaultMapVariant.width,
		height: defaultMapVariant.height,
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
	const ambientAnimationFrameRef = useRef<number | null>(null);
	const svgRef = useRef<SVGSVGElement | null>(null);
	const viewportRef = useRef<HTMLDivElement | null>(null);
	const clearTimer = useCallback(() => {
		if (travelFrameRef.current) {
			window.cancelAnimationFrame(travelFrameRef.current);
			travelFrameRef.current = null;
		}
		setPathMoving(false);
	}, []);
	const stopMovementLoop = useCallback(() => {
		if (movementFrameRef.current) {
			window.cancelAnimationFrame(movementFrameRef.current);
			movementFrameRef.current = null;
		}
		movementTimestampRef.current = null;
		setKeyboardMoving(false);
	}, []);
	const cancelCurrentMovement = useCallback(() => {
		clearTimer();
		stopMovementLoop();
		pressedKeysRef.current.clear();
		setTravelingTo(null);
	}, [clearTimer, stopMovementLoop]);
	const availableBackgrounds = useMemo(
		() =>
			showLegacyBackground
				? townMapVariants
				: townMapVariants.filter(
						(background) => background.id !== LEGACY_BACKGROUND_ID,
					),
		[showLegacyBackground],
	);
	const seedLayoutEnabled = activeBackgroundId === LEGACY_BACKGROUND_ID;
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
		const frame = window.requestAnimationFrame(() => {
			const legacyBackgroundEnabled = isLegacyBackgroundEnabled(
				window.localStorage.getItem(SHOW_LEGACY_BACKGROUND_STORAGE_KEY),
			);
			const savedBackground = window.localStorage.getItem(
				ACTIVE_BACKGROUND_STORAGE_KEY,
			);

			setShowLegacyBackground(legacyBackgroundEnabled);
			if (
				isTownMapBackgroundId(savedBackground) &&
				(legacyBackgroundEnabled || savedBackground !== LEGACY_BACKGROUND_ID)
			) {
				setActiveBackgroundId(savedBackground);
			}
		});

		return () => window.cancelAnimationFrame(frame);
	}, []);

	useEffect(() => {
		window.localStorage.setItem(
			SHOW_LEGACY_BACKGROUND_STORAGE_KEY,
			String(showLegacyBackground),
		);

		if (!showLegacyBackground && activeBackgroundId === LEGACY_BACKGROUND_ID) {
			const frame = window.requestAnimationFrame(() => {
				const nextMapVariant = getTownMapVariant(defaultTownMapBackgroundId);

				clearTimer();
				stopMovementLoop();
				pressedKeysRef.current.clear();
				setDragTarget(null);
				setHoveredStopId(null);
				setActiveStopId(null);
				setTravelingTo(null);
				setLastStopId(null);
				setExitPassThroughStopId(null);
				setCharacterVisible(true);
				setProximitySuppressed(false);
				setCharacterPosition(nextMapVariant.startPosition);
				positionRef.current = nextMapVariant.startPosition;
				setDevDrafts(createSeedDevDrafts(defaultTownMapBackgroundId));
				setDraftsHydrated(false);
				setActiveBackgroundId(defaultTownMapBackgroundId);
			});

			return () => window.cancelAnimationFrame(frame);
		}
	}, [activeBackgroundId, clearTimer, showLegacyBackground, stopMovementLoop]);

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
			setExitPassThroughStopId(null);
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
	}, [activeBackgroundId, activeMapVariant.startPosition, clearTimer, stopMovementLoop]);

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
	}, [stopMovementLoop]);

	useEffect(() => {
		const interval = window.setInterval(() => {
			setSpriteTick((current) => current + 1);
		}, prefersReducedMotion ? 220 : 140);

		return () => window.clearInterval(interval);
	}, [prefersReducedMotion]);

	useEffect(() => {
		const frame = window.requestAnimationFrame(() => {
			setAmbientActors(createAmbientActors(activeBackgroundId));
		});

		return () => window.cancelAnimationFrame(frame);
	}, [activeBackgroundId, ambientSpriteSeed]);

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
		const frame = window.requestAnimationFrame(() => {
			setCameraReady(true);
		});
		const observer = new ResizeObserver(syncViewport);
		observer.observe(element);

		return () => {
			window.cancelAnimationFrame(frame);
			observer.disconnect();
		};
	}, []);

	useEffect(() => {
		return () => {
			if (travelFrameRef.current) {
				window.cancelAnimationFrame(travelFrameRef.current);
			}
			if (movementFrameRef.current) {
				window.cancelAnimationFrame(movementFrameRef.current);
			}
			if (ambientAnimationFrameRef.current) {
				window.cancelAnimationFrame(ambientAnimationFrameRef.current);
			}
		};
	}, []);

	function runTravel(
		points: Position[],
		onDone: (completed: boolean) => void,
		targetStopId?: StopId | null,
	) {
		clearTimer();

		if (points.length < 2) {
			onDone(false);
			return;
		}

		if (instantTravel) {
			const finalPoint = points[points.length - 1];
			setCharacterPosition(finalPoint);
			positionRef.current = finalPoint;
			setPathMoving(false);
			onDone(true);
			return;
		}

		setPathMoving(true);

		let currentPointIndex = 1;
		let lastTimestamp: number | null = null;

		const step = (timestamp: number) => {
			if (currentPointIndex >= points.length) {
				travelFrameRef.current = null;
				setPathMoving(false);
				onDone(true);
				return;
			}

			const previousTimestamp = lastTimestamp ?? timestamp;
			const deltaMs = Math.min(timestamp - previousTimestamp, 32);
			lastTimestamp = timestamp;
			const deltaSeconds = deltaMs / 1000;
			let remainingDistance =
				getCharacterTravelSpeed(prefersReducedMotion) * deltaSeconds;
			let currentPoint = positionRef.current;
			let moved = false;
			let safetyCounter = 0;

			while (remainingDistance > 0.001 && currentPointIndex < points.length) {
				safetyCounter += 1;
				if (safetyCounter > 8) {
					break;
				}

				const targetPoint = points[currentPointIndex];
				const dx = targetPoint.x - currentPoint.x;
				const dy = targetPoint.y - currentPoint.y;
				const distance = Math.hypot(dx, dy);

				if (distance <= 0.001) {
					currentPointIndex += 1;
					continue;
				}

				if (Math.abs(dx) > Math.abs(dy)) {
					setFacing(dx > 0 ? "right" : "left");
				} else if (Math.abs(dy) > 0.1) {
					setFacing(dy > 0 ? "down" : "up");
				}

				if (distance <= remainingDistance) {
					currentPoint = targetPoint;
					remainingDistance -= distance;
					currentPointIndex += 1;
					moved = true;
					continue;
				}

				const stepX = (dx / distance) * remainingDistance;
				const stepY = (dy / distance) * remainingDistance;
				const nextPoint = resolveCharacterMovement(
					currentPoint,
					stepX,
					stepY,
					targetStopId,
				);

				if (nextPoint === currentPoint) {
					travelFrameRef.current = null;
					setPathMoving(false);
					onDone(false);
					return;
				}

				currentPoint = nextPoint;
				remainingDistance = 0;
				moved = true;
			}

			if (moved) {
				setCharacterPosition(currentPoint);
				positionRef.current = currentPoint;
				setCharacterVisible(true);
				setLastStopId(null);
				setProximitySuppressed(false);
			}

			if (currentPointIndex >= points.length) {
				travelFrameRef.current = null;
				setPathMoving(false);
				onDone(true);
				return;
			}

			travelFrameRef.current = window.requestAnimationFrame(step);
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
		setExitPassThroughStopId(null);
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

	const isWithinStopExitCorridor = useCallback((point: Position, stopId: StopId) => {
		const stop = getStop(effectiveStops, stopId);

		if (isUnsetPosition(stop.door) || isUnsetPosition(stop.exit)) {
			return false;
		}

		const doorDistance = Math.hypot(point.x - stop.door.x, point.y - stop.door.y);
		const exitDistance = Math.hypot(point.x - stop.exit.x, point.y - stop.exit.y);
		const segmentDistance = getDistanceToSegment(point, stop.door, stop.exit);

		return doorDistance <= 28 || exitDistance <= 32 || segmentDistance <= 24;
	}, [effectiveStops]);

	const isPlayerNavigablePoint = useCallback((point: Position, ignoreStopId?: StopId | null) => {
		if (
			exitPassThroughStopId &&
			isWithinStopExitCorridor(point, exitPassThroughStopId)
		) {
			return true;
		}

		return isNavigablePoint(point, ignoreStopId);
	}, [
		exitPassThroughStopId,
		isNavigablePoint,
		isWithinStopExitCorridor,
	]);

	useEffect(() => {
		if (
			!exitPassThroughStopId ||
			activeStopId ||
			travelingTo
		) {
			return;
		}

		if (!isWithinStopExitCorridor(characterPosition, exitPassThroughStopId)) {
			const frame = window.requestAnimationFrame(() => {
				setExitPassThroughStopId(null);
			});

			return () => window.cancelAnimationFrame(frame);
		}
	}, [
		activeStopId,
		characterPosition,
		exitPassThroughStopId,
		isWithinStopExitCorridor,
		travelingTo,
	]);

	const findPath = useCallback((
		start: Position,
		end: Position,
		targetStopId?: StopId | null,
		canNavigatePoint: (point: Position, ignoreStopId?: StopId | null) => boolean = isNavigablePoint,
	): Position[] => {
		const gridSize = 12; // More granular for better navigation
		const startX = Math.floor(start.x / gridSize);
		const startY = Math.floor(start.y / gridSize);
		const endX = Math.floor(end.x / gridSize);
		const endY = Math.floor(end.y / gridSize);

		if (!canNavigatePoint(end, targetStopId)) {
			return [];
		}

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
				if (canNavigatePoint(testPoint, targetStopId)) {
					visited.add(key);
					parentMap.set(key, [cx, cy]);
					queue.push([nx, ny]);
				}
			}
		}

		if (!reached) {
			return [];
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

		if (!targetKey) return [];

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
				
				const segmentDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
				const samples = Math.max(1, Math.ceil(segmentDistance / 8));
				let segmentClear = true;

				for (let index = 1; index <= samples; index += 1) {
					const progress = index / samples;
					const samplePoint = {
						x: p1.x + (p2.x - p1.x) * progress,
						y: p1.y + (p2.y - p1.y) * progress,
					};

					if (!canNavigatePoint(samplePoint, targetStopId)) {
						segmentClear = false;
						break;
					}
				}

				if (segmentClear) {
					path.splice(i + 1, 1);
					i--;
				}
			}
		}

		return path;
	}, [activeMapVariant.height, activeMapVariant.width, isNavigablePoint]);

	const hasClearTravelLine = useCallback((start: Position, end: Position) => {
		const distance = Math.hypot(end.x - start.x, end.y - start.y);
		const samples = Math.max(1, Math.ceil(distance / 8));

		for (let index = 1; index <= samples; index += 1) {
			const progress = index / samples;
			const samplePoint = {
				x: start.x + (end.x - start.x) * progress,
				y: start.y + (end.y - start.y) * progress,
			};

			if (!isNavigablePoint(samplePoint)) {
				return false;
			}
		}

		return true;
	}, [isNavigablePoint]);

	const resolveCharacterMovement = useCallback((
		currentPoint: Position,
		stepX: number,
		stepY: number,
		ignoreStopId?: StopId | null,
	) => {
		const fullCandidate = {
			x: clamp(currentPoint.x + stepX, 0, activeMapVariant.width),
			y: clamp(currentPoint.y + stepY, 0, activeMapVariant.height),
		};

		if (isPlayerNavigablePoint(fullCandidate, ignoreStopId)) {
			return fullCandidate;
		}

		const horizontalCandidate = {
			x: clamp(currentPoint.x + stepX, 0, activeMapVariant.width),
			y: currentPoint.y,
		};
		if (isPlayerNavigablePoint(horizontalCandidate, ignoreStopId)) {
			return horizontalCandidate;
		}

		const verticalCandidate = {
			x: currentPoint.x,
			y: clamp(currentPoint.y + stepY, 0, activeMapVariant.height),
		};
		if (isPlayerNavigablePoint(verticalCandidate, ignoreStopId)) {
			return verticalCandidate;
		}

		return currentPoint;
	}, [
		activeMapVariant.height,
		activeMapVariant.width,
		isPlayerNavigablePoint,
	]);

	const findNearestAmbientFeet = useCallback((
		actor: AmbientActorState,
		desiredFeet: Position,
		actors: AmbientActorState[],
	) => {
		for (let radius = 0; radius <= 160; radius += 12) {
			const steps = radius === 0 ? 1 : 16;

			for (let index = 0; index < steps; index += 1) {
				const angle = (index / steps) * Math.PI * 2;
				const candidateFeet = {
					x: clamp(
						desiredFeet.x + Math.cos(angle) * radius,
						16,
						activeMapVariant.width - 16,
					),
					y: clamp(
						desiredFeet.y + Math.sin(angle) * radius,
						16,
						activeMapVariant.height - 16,
					),
				};

				if (!isNavigablePoint(candidateFeet)) {
					continue;
				}

				if (
					Math.hypot(
						candidateFeet.x - characterPosition.x,
						candidateFeet.y - characterPosition.y,
					) < 34
				) {
					continue;
				}

				const overlapsActor = actors.some((otherActor) => {
					if (otherActor.id === actor.id) {
						return false;
					}

					const otherFeet = getAmbientFeetPosition(otherActor);
					return (
						Math.hypot(
							candidateFeet.x - otherFeet.x,
							candidateFeet.y - otherFeet.y,
						) < 24
					);
				});

				if (!overlapsActor) {
					return candidateFeet;
				}
			}
		}

		return desiredFeet;
	}, [
		activeMapVariant.height,
		activeMapVariant.width,
		characterPosition.x,
		characterPosition.y,
		isNavigablePoint,
	]);

	const onAmbientTick = useEffectEvent((deltaMs: number) => {
		const deltaSeconds = deltaMs / 1000;

		setAmbientActors((currentActors) => {
			const nextActors = currentActors
				.filter((actor) => ambientSpriteIds.has(actor.id))
				.map((actor) => {
				const nextActor: AmbientActorState = {
					...actor,
					path: [...actor.path],
				};
				let currentFeet = getAmbientFeetPosition(nextActor);

				if (!isNavigablePoint(currentFeet)) {
					const repairedFeet = findNearestAmbientFeet(
						nextActor,
						currentFeet,
						currentActors,
					);
					nextActor.position = getAmbientPositionFromFeet(
						repairedFeet,
						nextActor,
					);
					nextActor.spawn = nextActor.position;
					nextActor.path = [];
					nextActor.target = null;
					nextActor.moving = false;
					currentFeet = repairedFeet;
				}

				if (isStaticAmbientActor(actor.id)) {
					return {
						...nextActor,
						conversationCooldownRemainingMs: 0,
						conversationPartnerId: null,
						conversationRemainingMs: 0,
						emoteAnimationMs: nextActor.defaultEmoteVisible
							? nextActor.emoteAnimationMs + deltaMs
							: 0,
						emoteRemainingMs: nextActor.defaultEmoteVisible
							? Number.POSITIVE_INFINITY
							: Math.max(0, nextActor.emoteRemainingMs - deltaMs),
						emoteVisible:
							nextActor.defaultEmoteVisible ||
							nextActor.emoteRemainingMs > 0,
						playerInteractionCooldownRemainingMs: 0,
						playerInteractionRemainingMs: 0,
					};
				}

				nextActor.conversationRemainingMs = Math.max(
					0,
					nextActor.conversationRemainingMs - deltaMs,
				);
				nextActor.conversationCooldownRemainingMs = Math.max(
					0,
					nextActor.conversationCooldownRemainingMs - deltaMs,
				);
				nextActor.playerInteractionCooldownRemainingMs = Math.max(
					0,
					nextActor.playerInteractionCooldownRemainingMs - deltaMs,
				);
				nextActor.playerInteractionRemainingMs = Math.max(
					0,
					nextActor.playerInteractionRemainingMs - deltaMs,
				);

				if (nextActor.target) {
					nextActor.conversationPartnerId = null;
					nextActor.conversationRemainingMs = 0;
					nextActor.playerInteractionRemainingMs = 0;
					const dx = nextActor.target.x - currentFeet.x;
					const dy = nextActor.target.y - currentFeet.y;
					const distance = Math.hypot(dx, dy);
					const step = nextActor.speed * deltaSeconds;

					nextActor.facing = getFacingFromVector(dx, dy);
					nextActor.emoteVisible = false;
					nextActor.emoteAnimationMs = 0;
					nextActor.emoteRemainingMs = 0;

					if (distance <= step || distance < 2) {
						nextActor.position = getAmbientPositionFromFeet(
							nextActor.target,
							nextActor,
						);
						nextActor.path = nextActor.path.slice(1);
						nextActor.target = nextActor.path[0] ?? null;
						nextActor.moving = nextActor.target !== null;

						if (!nextActor.target) {
							nextActor.idleRemainingMs = getAmbientIdleDurationMs(nextActor.id);
							nextActor.emoteRemainingMs =
								Boolean(nextActor.emote) && Math.random() > 0.7
									? getAmbientEmoteDurationMs(nextActor.id)
									: 0;
							nextActor.emoteAnimationMs = 0;
							nextActor.idleRemainingMs = Math.max(
								nextActor.idleRemainingMs,
								nextActor.emoteRemainingMs +
									getAmbientPostEmoteIdleMs(nextActor.id),
							);
							nextActor.emoteVisible = nextActor.emoteRemainingMs > 0;
						}

						return nextActor;
					}

					const nextFeet = {
						x: currentFeet.x + (dx / distance) * step,
						y: currentFeet.y + (dy / distance) * step,
					};

					if (!isNavigablePoint(nextFeet)) {
						nextActor.target = null;
						nextActor.path = [];
						nextActor.moving = false;
						nextActor.idleRemainingMs = 500 + Math.random() * 1200;
						nextActor.emoteAnimationMs = 0;
						nextActor.emoteRemainingMs = 0;
						return nextActor;
					}

					nextActor.position = getAmbientPositionFromFeet(nextFeet, nextActor);
					nextActor.moving = true;
					return nextActor;
				}

				nextActor.moving = false;
				nextActor.emoteAnimationMs =
					nextActor.emoteRemainingMs > 0
						? nextActor.emoteAnimationMs + deltaMs
						: 0;
				nextActor.emoteRemainingMs = Math.max(
					0,
					nextActor.emoteRemainingMs - deltaMs,
				);
				nextActor.emoteVisible = nextActor.emoteRemainingMs > 0;
				nextActor.idleRemainingMs = Math.max(
					0,
					nextActor.idleRemainingMs - deltaMs,
				);

				if (
					nextActor.conversationRemainingMs > 0 &&
					nextActor.conversationPartnerId
				) {
					return nextActor;
				}

				if (nextActor.playerInteractionRemainingMs > 0) {
					const playerDx = characterPosition.x - currentFeet.x;
					const playerDy = characterPosition.y - currentFeet.y;
					const playerDistance = Math.hypot(playerDx, playerDy);

					if (playerDistance <= 92 && hasClearTravelLine(currentFeet, characterPosition)) {
						nextActor.facing = getFacingFromVector(playerDx, playerDy);
						nextActor.idleRemainingMs = Math.max(
							nextActor.idleRemainingMs,
							120,
						);
						return nextActor;
					}

					nextActor.playerInteractionRemainingMs = 0;
				}

				if (nextActor.idleRemainingMs > 0) {
					nextActor.conversationPartnerId = null;
					return nextActor;
				}

				const spawnFeet = getAmbientFeetPosition({
					...nextActor,
					position: nextActor.spawn,
				});
				const roamRadius = getAmbientRoamRadius(nextActor.id);
				let nextPath: Position[] | null = null;

				for (let attempt = 0; attempt < 14; attempt += 1) {
					const angle = Math.random() * Math.PI * 2;
					const distance = 18 + Math.random() * roamRadius;
					const candidateFeet = {
						x: clamp(
							spawnFeet.x + Math.cos(angle) * distance,
							16,
							activeMapVariant.width - 16,
						),
						y: clamp(
							spawnFeet.y + Math.sin(angle) * distance,
							16,
							activeMapVariant.height - 16,
						),
					};

					if (!isNavigablePoint(candidateFeet)) {
						continue;
					}

					if (
						Math.hypot(
							candidateFeet.x - characterPosition.x,
							candidateFeet.y - characterPosition.y,
						) < 34
					) {
						continue;
					}

					const overlapsOtherActor = currentActors.some((otherActor) => {
						if (otherActor.id === nextActor.id) {
							return false;
						}

						const otherFeet = getAmbientFeetPosition(otherActor);
						return (
							Math.hypot(
								candidateFeet.x - otherFeet.x,
								candidateFeet.y - otherFeet.y,
							) < 24
						);
					});

					if (overlapsOtherActor) {
						continue;
					}

					const candidatePath = findPath(currentFeet, candidateFeet);
					if (candidatePath.length < 2) {
						continue;
					}

					if (
						candidatePath.length === 2 &&
						!hasClearTravelLine(currentFeet, candidateFeet)
					) {
						continue;
					}

					nextPath = candidatePath.slice(1);
					break;
				}

				if (!nextPath || nextPath.length === 0) {
					nextActor.idleRemainingMs = 500 + Math.random() * 1000;
					nextActor.emoteRemainingMs =
						Boolean(nextActor.emote) && Math.random() > 0.84
							? getAmbientEmoteDurationMs(nextActor.id)
							: 0;
					nextActor.emoteAnimationMs = 0;
					nextActor.idleRemainingMs = Math.max(
						nextActor.idleRemainingMs,
						nextActor.emoteRemainingMs +
							getAmbientPostEmoteIdleMs(nextActor.id),
					);
					nextActor.emoteVisible = nextActor.emoteRemainingMs > 0;
					return nextActor;
				}

				const speedRange = getAmbientSpeedRange(nextActor.id);
				nextActor.speed =
					speedRange.min + Math.random() * (speedRange.max - speedRange.min);
				nextActor.path = nextPath;
				nextActor.target = nextPath[0] ?? null;
				nextActor.moving = nextActor.target !== null;
				nextActor.conversationPartnerId = null;
				nextActor.conversationRemainingMs = 0;
				nextActor.emoteVisible = false;
				nextActor.emoteAnimationMs = 0;
				nextActor.emoteRemainingMs = 0;

				if (nextActor.target) {
					nextActor.facing = getFacingFromVector(
						nextActor.target.x - currentFeet.x,
						nextActor.target.y - currentFeet.y,
					);
				}

				return nextActor;
			});

			for (const actor of nextActors) {
				if (
					actor.conversationRemainingMs <= 0 ||
					!actor.conversationPartnerId
				) {
					actor.conversationPartnerId = null;
					continue;
				}

				const partner = nextActors.find(
					(entry) => entry.id === actor.conversationPartnerId,
				);
				if (!partner || partner.id === actor.id) {
					actor.conversationPartnerId = null;
					actor.conversationRemainingMs = 0;
					actor.conversationCooldownRemainingMs = Math.max(
						actor.conversationCooldownRemainingMs,
						2800 + Math.random() * 2200,
					);
					continue;
				}

				const actorFeet = getAmbientFeetPosition(actor);
				const partnerFeet = getAmbientFeetPosition(partner);
				const distance = Math.hypot(
					actorFeet.x - partnerFeet.x,
					actorFeet.y - partnerFeet.y,
				);

				if (distance > 56 || actor.moving || partner.moving) {
					actor.conversationPartnerId = null;
					actor.conversationRemainingMs = 0;
					actor.conversationCooldownRemainingMs = Math.max(
						actor.conversationCooldownRemainingMs,
						2800 + Math.random() * 2200,
					);
					continue;
				}

				actor.facing = getFacingFromVector(
					partnerFeet.x - actorFeet.x,
					partnerFeet.y - actorFeet.y,
				);
				actor.target = null;
				actor.path = [];
				actor.idleRemainingMs = Math.max(actor.idleRemainingMs, 240);
				actor.emoteVisible = actor.emoteRemainingMs > 0;
				actor.idleRemainingMs = Math.max(
					actor.idleRemainingMs,
					actor.emoteRemainingMs + getAmbientPostEmoteIdleMs(actor.id),
				);
			}

			for (let index = 0; index < nextActors.length; index += 1) {
				const actor = nextActors[index];
				if (
					!isConversationalAmbientActor(actor.id) ||
					actor.moving ||
					actor.target ||
					actor.conversationRemainingMs > 0 ||
					actor.conversationCooldownRemainingMs > 0 ||
					actor.idleRemainingMs <= 200
				) {
					continue;
				}

				const actorFeet = getAmbientFeetPosition(actor);

				for (let partnerIndex = index + 1; partnerIndex < nextActors.length; partnerIndex += 1) {
					const partner = nextActors[partnerIndex];
					if (
						!isConversationalAmbientActor(partner.id) ||
						partner.moving ||
						partner.target ||
						partner.conversationRemainingMs > 0 ||
						partner.conversationCooldownRemainingMs > 0 ||
						partner.idleRemainingMs <= 200
					) {
						continue;
					}

					const partnerFeet = getAmbientFeetPosition(partner);
					const distance = Math.hypot(
						actorFeet.x - partnerFeet.x,
						actorFeet.y - partnerFeet.y,
					);

					if (distance < 18 || distance > 44) {
						continue;
					}

					if (!hasClearTravelLine(actorFeet, partnerFeet)) {
						continue;
					}

					if (Math.random() > 0.018) {
						continue;
					}

					const duration = 2200 + Math.random() * 2600;
					const actorEmoteDuration = getAmbientEmoteDurationMs(actor.id);
					const partnerEmoteDuration = getAmbientEmoteDurationMs(partner.id);
					const actorPostEmoteIdle = getAmbientPostEmoteIdleMs(actor.id);
					const partnerPostEmoteIdle = getAmbientPostEmoteIdleMs(partner.id);

					actor.conversationPartnerId = partner.id;
					partner.conversationPartnerId = actor.id;
					actor.conversationRemainingMs = duration;
					partner.conversationRemainingMs = duration;
					actor.conversationCooldownRemainingMs =
						duration + actorEmoteDuration + actorPostEmoteIdle + 4200 + Math.random() * 2600;
					partner.conversationCooldownRemainingMs =
						duration + partnerEmoteDuration + partnerPostEmoteIdle + 4200 + Math.random() * 2600;
					actor.idleRemainingMs =
						duration + actorEmoteDuration + actorPostEmoteIdle;
					partner.idleRemainingMs =
						duration + partnerEmoteDuration + partnerPostEmoteIdle;
					actor.facing = getFacingFromVector(
						partnerFeet.x - actorFeet.x,
						partnerFeet.y - actorFeet.y,
					);
					partner.facing = getFacingFromVector(
						actorFeet.x - partnerFeet.x,
						actorFeet.y - partnerFeet.y,
					);
					actor.target = null;
					partner.target = null;
					actor.path = [];
					partner.path = [];
					actor.moving = false;
					partner.moving = false;
					actor.emoteRemainingMs = actor.emote ? actorEmoteDuration : 0;
					partner.emoteRemainingMs = partner.emote ? partnerEmoteDuration : 0;
					actor.emoteAnimationMs = 0;
					partner.emoteAnimationMs = 0;
					actor.emoteVisible = actor.emoteRemainingMs > 0;
					partner.emoteVisible = partner.emoteRemainingMs > 0;
					break;
				}
			}

			for (const actor of nextActors) {
				if (
					!isConversationalAmbientActor(actor.id) ||
					actor.moving ||
					actor.target ||
					actor.conversationRemainingMs > 0 ||
					actor.playerInteractionRemainingMs > 0 ||
					actor.playerInteractionCooldownRemainingMs > 0 ||
					actor.idleRemainingMs > 160
				) {
					continue;
				}

				const actorFeet = getAmbientFeetPosition(actor);
				const playerDx = characterPosition.x - actorFeet.x;
				const playerDy = characterPosition.y - actorFeet.y;
				const playerDistance = Math.hypot(playerDx, playerDy);

				if (playerDistance < 28 || playerDistance > 88) {
					continue;
				}

				if (!hasClearTravelLine(actorFeet, characterPosition)) {
					continue;
				}

				if (Math.random() > 0.012) {
					continue;
				}

				const emoteDuration = actor.emote ? getAmbientEmoteDurationMs(actor.id) * 0.75 : 0;
				const postIdle = getAmbientPostEmoteIdleMs(actor.id) * 0.75;
				const interactionDuration = emoteDuration + postIdle;

				actor.facing = getFacingFromVector(playerDx, playerDy);
				actor.target = null;
				actor.path = [];
				actor.moving = false;
				actor.conversationPartnerId = null;
				actor.conversationRemainingMs = 0;
				actor.playerInteractionRemainingMs = interactionDuration;
				actor.playerInteractionCooldownRemainingMs =
					interactionDuration + 4200 + Math.random() * 4200;
				actor.emoteRemainingMs = emoteDuration;
				actor.emoteAnimationMs = 0;
				actor.emoteVisible = actor.emoteRemainingMs > 0;
				actor.idleRemainingMs = Math.max(actor.idleRemainingMs, interactionDuration);
			}

			return nextActors;
		});
	});

	useEffect(() => {
		if (activeBackgroundId !== defaultTownMapBackgroundId) {
			return;
		}

		let previousTimestamp: number | null = null;

		const step = (timestamp: number) => {
			if (previousTimestamp === null) {
				previousTimestamp = timestamp;
			} else {
				onAmbientTick(Math.min(timestamp - previousTimestamp, 48));
				previousTimestamp = timestamp;
			}

			ambientAnimationFrameRef.current = window.requestAnimationFrame(step);
		};

		ambientAnimationFrameRef.current = window.requestAnimationFrame(step);

		return () => {
			if (ambientAnimationFrameRef.current) {
				window.cancelAnimationFrame(ambientAnimationFrameRef.current);
				ambientAnimationFrameRef.current = null;
			}
		};
	}, [activeBackgroundId]);

	function handleEnterStop(stopId: StopId) {
		if (activeStopId) {
			return;
		}

		cancelCurrentMovement();
		setGuideOpen(false);
		const stop = getStop(effectiveStops, stopId);
		if (stop.outline.length < 3 || isUnsetPosition(stop.door)) {
			return;
		}
		setExitPassThroughStopId(null);
		setTravelingTo(stopId);
		setCharacterVisible(true);

		const path = isUnsetPosition(stop.exit)
			? findPath(
					positionRef.current,
					stop.door,
					stopId,
					isPlayerNavigablePoint,
				)
			: mergeTravelPaths(
					findPath(
						positionRef.current,
						stop.exit,
						null,
						isPlayerNavigablePoint,
					),
					findPath(
						stop.exit,
						stop.door,
						stopId,
						isPlayerNavigablePoint,
					),
				);

		runTravel(path, (completed) => {
			setTravelingTo(null);
			if (!completed) {
				return;
			}
			setActiveStopId(stopId);
			setLastStopId(stopId);
			setCharacterVisible(false);
		}, stopId);
	}

	function handleCloseStop() {
		if (!activeStopId) {
			return;
		}

		cancelCurrentMovement();
		const stop = getStop(effectiveStops, activeStopId);
		if (isUnsetPosition(stop.door) || isUnsetPosition(stop.exit)) {
			setActiveStopId(null);
			setTravelingTo(null);
			return;
		}
		setActiveStopId(null);
		setTravelingTo(stop.id);
		setCharacterVisible(true);

		const path = findPath(
			stop.door,
			stop.exit,
			stop.id,
			isPlayerNavigablePoint,
		);

		runTravel(path, (completed) => {
			setTravelingTo(null);
			if (!completed) {
				return;
			}
			setExitPassThroughStopId(stop.id);
			setLastStopId(stop.id);
		}, stop.id);
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

		if (activeStopId) {
			return;
		}

		if (!isPlayerNavigablePoint(nextPoint)) {
			return;
		}

		cancelCurrentMovement();
		setGuideOpen(false);
		setCharacterVisible(true);

		const path = findPath(
			positionRef.current,
			nextPoint,
			null,
			isPlayerNavigablePoint,
		);

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
	const trainerMoving = keyboardMoving || travelingTo !== null || pathMoving;
	const trainerFrame = useMemo(() => {
		if (!trainerMoving) {
			return 0;
		}

		return spriteTick % 4;
	}, [spriteTick, trainerMoving]);

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
		if (activeStopId) {
			handleCloseStop();
			return;
		}

		if (travelingTo || pathMoving || keyboardMoving) {
			cancelCurrentMovement();
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
			const speed = getCharacterTravelSpeed(prefersReducedMotion);
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
			const nextPoint = resolveCharacterMovement(
				positionRef.current,
				stepX,
				stepY,
			);

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
		resolveCharacterMovement,
		stopMovementLoop,
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

		const key = event.key.toLowerCase();
		const isMovementKey =
			key === "w" ||
			key === "arrowup" ||
			key === "s" ||
			key === "arrowdown" ||
			key === "a" ||
			key === "arrowleft" ||
			key === "d" ||
			key === "arrowright";

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
			(editorEnabled && devInteractionMode !== "view")
		) {
			return;
		}

		if (isMovementKey && (travelingTo || pathMoving)) {
			cancelCurrentMovement();
		}

		if (travelingTo) {
			return;
		}

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
				setFacing(
					key === "a" || key === "arrowleft"
						? "left"
						: key === "d" || key === "arrowright"
							? "right"
							: key === "w" || key === "arrowup"
								? "up"
								: "down",
				);
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
	}, [stopMovementLoop]);

	return (
		<div className="relative min-h-screen overflow-hidden">
			<div className="town-page__chrome fixed inset-0 z-50 pointer-events-none" />

			<main className="relative z-10 h-[100dvh] w-screen overflow-hidden">
				<section className="h-full w-full bg-transparent" aria-label="Pokemon-inspired portfolio town">
					<div className="pointer-events-none absolute left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-20 flex flex-col gap-3 sm:left-6 sm:right-6 sm:top-6 sm:flex-row sm:items-start sm:justify-between">
						<div className="pointer-events-auto flex flex-wrap items-stretch gap-3 sm:max-w-[calc(100%-11rem)] sm:items-center">
							<button
								type="button"
								className="pixel-button min-h-[52px] flex-1 px-4 py-3 text-xs sm:min-h-0 sm:flex-none sm:px-6 sm:py-3 sm:text-sm"
								onClick={() => setGuideOpen(true)}
							>
								Guide
							</button>
							{availableBackgrounds.length > 1 ? (
								<label className="pixel-card pointer-events-auto flex min-w-0 flex-[999_1_16rem] items-center gap-3 bg-white/85 px-3 py-2 sm:flex-[0_1_20rem] sm:px-4">
									<span className="shrink-0 font-dot-gothic text-[10px] uppercase tracking-wider text-ink-soft sm:text-xs">
										Background
									</span>
									<select
										className="min-w-0 flex-1 bg-transparent font-dot-gothic text-xs outline-none sm:text-sm"
										value={activeBackgroundId}
										onChange={(event) =>
											handleBackgroundChange(
												event.target.value as TownMapBackgroundId,
											)
										}
									>
										{availableBackgrounds.map((background) => (
											<option key={background.id} value={background.id}>
												{background.label}
											</option>
										))}
									</select>
								</label>
							) : null}
							{editorEnabled ? (
								<button
									type="button"
									className="pixel-button min-h-[52px] flex-1 bg-sky px-4 py-3 text-xs sm:min-h-0 sm:flex-none sm:px-6 sm:py-3 sm:text-sm"
									onClick={() => setDevToolOpen(true)}
								>
									Map Editor
								</button>
							) : null}
						</div>
						<Link
							className="pixel-button pointer-events-auto min-h-[52px] w-full px-4 py-3 text-center text-xs sm:min-h-0 sm:w-auto sm:px-6 sm:py-3 sm:text-sm"
							href="/admin"
						>
							Admin Route
						</Link>
					</div>

					<div
						ref={viewportRef}
						className="relative flex h-full w-full items-center justify-center overflow-hidden bg-transparent"
					>
						<div
							className={`map-surface-scanlines ${
								cameraReady
									? "map-scene absolute left-0 top-0"
									: "relative h-full w-full"
							} overflow-hidden ${
								editorEnabled && devInteractionMode === "capture"
									? "cursor-crosshair"
									: devInteractionMode === "move"
										? "cursor-grab"
										: ""
							}`}
							style={
								cameraReady
									? {
											height: activeMapVariant.height,
											transform: sceneTransform,
											transformOrigin: "top left",
											width: activeMapVariant.width,
										}
									: undefined
							}
						>
							<Image
								className="map-image"
								src={activeMapVariant.imageSrc}
								alt=""
								fill
								sizes="100vw"
								aria-hidden="true"
								priority
								style={{ objectFit: cameraReady ? "fill" : "cover" }}
							/>
							<TownMapOverlay
								activeDraftPoints={activeDraftPoints}
								activePolygonKind={activePolygonKind}
								activeStopId={activeStopId}
								ambientSprites={ambientActors}
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
								trainerFrame={trainerFrame}
								trainerMoving={trainerMoving}
								trainerTransform={trainerTransform}
								visibleStopId={visibleStopId}
								worldSpriteTick={spriteTick}
							/>
						</div>
					</div>
				</section>
			</main>

			{guideOpen ? (
				<div
					className="fixed inset-0 z-20 grid place-items-center bg-black/40 p-4 backdrop-blur-sm sm:p-6"
					role="presentation"
					onClick={() => setGuideOpen(false)}
				>
					<section
						className="pokedex-box flex w-[min(720px,calc(100vw-1rem))] max-w-full max-h-[min(calc(100dvh-1rem),900px)] flex-col gap-5 overflow-x-hidden overflow-y-auto p-5 scrollbar-thin sm:gap-6 sm:p-8"
						role="dialog"
						aria-modal="true"
						aria-labelledby="guide-dialog-title"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<p className="pixel-eyebrow">Pokemon Town Portfolio</p>
								<h2 className="m-0 font-dot-gothic text-xl leading-tight sm:text-2xl" id="guide-dialog-title">Choose your route through the work.</h2>
							</div>
							<button className="pixel-button w-full px-4 py-2 text-sm sm:w-auto" type="button" onClick={() => setGuideOpen(false)}>
								Close
							</button>
						</div>

						<p className="m-0 text-lg leading-tight sm:text-2xl">
							{content.profile.intro}
							<span className="pixel-arrow">▼</span>
						</p>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div className="pixel-card flex min-w-0 flex-col gap-1 bg-white/80 p-4">
								<span className="font-dot-gothic text-xs uppercase tracking-wider text-ink-soft">Current scene</span>
								<strong className="truncate text-lg leading-tight sm:text-xl">{sceneLabel}</strong>
							</div>
							<div className="pixel-card flex min-w-0 flex-col gap-1 bg-white/80 p-4">
								<span className="font-dot-gothic text-xs uppercase tracking-wider text-ink-soft">Mode</span>
								<strong className="truncate text-lg leading-tight sm:text-xl">{instantTravel ? "Recruiter mode" : "Walk mode"}</strong>
							</div>
							{content.profile.quickStats.map((stat) => (
								<div className="pixel-card flex min-w-0 flex-col gap-1 bg-white/80 p-4" key={stat.label}>
									<span className="font-dot-gothic text-xs uppercase tracking-wider text-ink-soft">{stat.label}</span>
									<strong className="truncate text-lg leading-tight sm:text-xl">{stat.value}</strong>
								</div>
							))}
						</div>

						<div className="flex flex-col gap-4 border-t border-line/10 pt-6">
							<div className="flex items-center justify-between gap-4">
								<p className="pixel-eyebrow">Settings</p>
							</div>
							<div className="pixel-card flex min-w-0 box-border flex-col gap-4 bg-white/40 p-4 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex min-w-0 flex-1 flex-col gap-1">
									<strong className="truncate text-base leading-tight sm:text-lg">Instant Travel</strong>
									<span className="font-dot-gothic text-xs text-ink-soft">Skip walking transitions between stops</span>
								</div>
								<button
									type="button"
									className={`pixel-button w-full px-4 py-2 text-sm transition-colors sm:w-auto ${instantTravel ? 'bg-accent' : 'bg-white'}`}
									onClick={() => setSkipTravel(!skipTravel)}
								>
									{instantTravel ? "Enabled" : "Disabled"}
								</button>
							</div>
							<div className="pixel-card flex min-w-0 box-border flex-col gap-4 bg-white/40 p-4 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex min-w-0 flex-1 flex-col gap-1">
									<strong className="truncate text-base leading-tight sm:text-lg">Legacy Background 1</strong>
									<span className="font-dot-gothic text-xs text-ink-soft">Show the original background as an optional alternate map</span>
								</div>
								<button
									type="button"
									className={`pixel-button w-full px-4 py-2 text-sm transition-colors sm:w-auto ${showLegacyBackground ? 'bg-accent' : 'bg-white'}`}
									onClick={() => setShowLegacyBackground(!showLegacyBackground)}
								>
									{showLegacyBackground ? "Enabled" : "Hidden"}
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
										className={`group flex min-w-0 box-border flex-col items-start gap-4 border-4 p-4 text-left transition-all sm:flex-row sm:items-center sm:gap-5 ${
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
										<span className={`flex h-12 w-12 shrink-0 items-center justify-center border-4 border-line font-dot-gothic text-lg sm:h-14 sm:w-14 sm:text-xl ${isCurrent ? 'bg-white' : 'bg-sky'}`}>
											{stop.order}
										</span>
										<div className="flex min-w-0 flex-1 flex-col gap-1">
											<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
												<strong className="truncate text-lg leading-tight sm:text-xl">{stop.title}</strong>
												{isRecommended && (
													<span className="shrink-0 bg-accent-strong px-2 py-0.5 font-dot-gothic text-[10px] uppercase text-white">
														Recommended
													</span>
												)}
											</div>
											<p className="m-0 text-base leading-tight text-ink-soft sm:truncate sm:text-lg">{stop.preview}</p>
										</div>
										<span className="ml-auto hidden font-dot-gothic text-xl text-accent-strong opacity-0 transition-opacity group-hover:opacity-100 sm:block sm:animate-pixel-blink">▶</span>
									</button>
								);
							})}
						</div>
					</section>
				</div>
			) : null}

			{activeStop && !guideOpen ? (
				<div
					className="fixed inset-0 z-20 grid place-items-center bg-black/40 p-4 backdrop-blur-md sm:p-6"
					role="presentation"
					onClick={handleCloseStop}
				>
					<section
						className="pokedex-box flex w-[min(1360px,calc(100vw-1rem))] max-h-[min(calc(100dvh-1rem),980px)] flex-col overflow-hidden p-5 sm:p-8"
						role="dialog"
						aria-modal="true"
						aria-labelledby="town-window-title"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="flex flex-col gap-4 border-b border-line/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-center gap-5">
								<div className="flex h-14 w-12 shrink-0 items-center justify-center border-4 border-line bg-sky font-dot-gothic text-xl shadow-pixel sm:h-16 sm:w-14 sm:text-2xl">
									{activeStop.order}
								</div>
								<div>
									<p className="pixel-eyebrow">{activeStop.title}</p>
									<h2 className="m-0 font-dot-gothic text-2xl leading-tight sm:text-3xl" id="town-window-title">{activeStop.shortLabel}</h2>
								</div>
							</div>
							<button className="pixel-button w-full px-6 py-3 text-base sm:w-auto sm:text-lg" type="button" onClick={handleCloseStop}>
								Close Room
							</button>
						</div>

						<div className="flex-1 min-h-0 overflow-auto pr-2 pt-8 scrollbar-thin">
							<div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-[1fr_320px]">
								<div className="pixel-card flex flex-col gap-1 border-line-soft/10 bg-white/60 p-5">
									<p className="m-0 text-lg leading-tight text-ink sm:text-2xl">{activeStop.subtitle}</p>
									<span className="font-dot-gothic text-xs uppercase tracking-widest text-ink-soft">Current stop</span>
								</div>
								<div className="pixel-card flex flex-col gap-2 bg-accent p-5 shadow-pixel">
									<p className="pixel-eyebrow text-xs!">At A Glance</p>
									<strong className="text-lg leading-tight sm:text-xl">{activeStop.preview}</strong>
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
					backgrounds={availableBackgrounds.map((background) => ({
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
