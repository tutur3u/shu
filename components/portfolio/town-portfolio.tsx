"use client";

import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import Image from "next/image";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
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
	normalizeDevDrafts,
	type DevDoorFxDraft,
	type DevMapDrafts,
	type DevInteractionMode,
	type DevLayerVisibility,
	type DevPolygonKind,
	type DevToolMode,
	type DevPolygonDraft,
} from "./map-dev-tool";
import {
	type AmbientActorState,
	createAmbientActors,
	getAmbientEmoteDurationMs,
	getAmbientFeetPosition,
	getAmbientIdleDurationMs,
	getAmbientPositionFromFeet,
	getAmbientPostEmoteIdleMs,
	getAmbientRoamRadius,
	getAmbientSpeedRange,
	getFacingFromVector,
	isConversationalAmbientActor,
	isStaticAmbientActor,
	OVERWORLD_AMBIENT_SPRITE_IDS,
} from "./town-ambient";
import {
	clampSpriteLibraryMode,
	getSpriteLibraryAssetBySlug,
	getSpriteLibraryAssetSlug,
	type LibrarySelection,
} from "./sprite-library-data";
import { TownGuideDialog } from "./town-guide-dialog";
import { TownLibraryDialog } from "./town-library-dialog";
import { TownMapOverlay } from "./town-map-overlay";
import { OVERWORLD_AMBIENT_SPRITES } from "./town-map-overlay-sprites";
import { TownPortfolioChrome } from "./town-portfolio-chrome";
import {
	ACTIVE_BACKGROUND_STORAGE_KEY,
	DEV_DRAFT_STORAGE_KEY,
	EMPTY_STOP_POSITION,
	getCameraFrame,
	getCharacterTravelSpeed,
	getDefaultLayerVisibility,
	getDistanceToSegment,
	getDraftStorageKey,
	getFacingFromMovementKey,
	getOutlineBounds,
	isLegacyBackgroundEnabled,
	isMovementKey,
	isTownMapBackgroundId,
	isUnsetPosition,
	LEGACY_BACKGROUND_ID,
	SHOW_LEGACY_BACKGROUND_STORAGE_KEY,
	mergeTravelPaths,
} from "./town-portfolio-helpers";
import { TownStopDialog } from "./town-stop-dialog";
import {
	clamp,
	type DragTarget,
	getRelevantLayerKeys,
	getStop,
	isPointInPolygon,
	isPolygonMode,
} from "./town-map-utils";

type DayPhase = "day" | "dusk" | "night";
const DAY_PHASE_VALUES = ["day", "dusk", "night"] as const;
const GUIDE_PANEL_VALUES = ["guide"] as const;
const STOP_QUERY_VALUES = [
	"about",
	"projects",
	"games",
	"contact",
	"admin",
	"coming-soon",
	"coming-soon-2",
	"coming-soon-3",
] as const;
const BACKGROUND_QUERY_VALUES = ["background", "background-2"] as const;

function getDayPhaseForHour(hour: number): DayPhase {
	if (hour >= 19 || hour < 6) {
		return "night";
	}

	if ((hour >= 6 && hour < 8) || (hour >= 17 && hour < 19)) {
		return "dusk";
	}

	return "day";
}

export function TownPortfolio({
	content,
	stops,
}: {
	content: PortfolioContent;
	stops: TownStop[];
}) {
	const [libraryQuery, setLibraryQuery] = useQueryStates(
		{
			asset: parseAsString,
			bg: parseAsStringLiteral(BACKGROUND_QUERY_VALUES),
			guide: parseAsStringLiteral(GUIDE_PANEL_VALUES),
			library: parseAsStringLiteral(["open", "viewer"] as const),
			mode: parseAsInteger,
			phase: parseAsStringLiteral(DAY_PHASE_VALUES),
			stop: parseAsStringLiteral(STOP_QUERY_VALUES),
		},
		{
			history: "replace",
		},
	);
	const ambientSpriteSeed = OVERWORLD_AMBIENT_SPRITES.map((sprite) => sprite.id).join("|");
	const editorEnabled = true;
	const initialBackgroundId = libraryQuery.bg ?? defaultTownMapBackgroundId;
	const initialStop =
		libraryQuery.stop
			? stops.find((stop) => stop.id === libraryQuery.stop) ?? null
			: null;
	const initialMapVariant = getTownMapVariant(initialBackgroundId);
	const initialCharacterPosition =
		initialStop && initialBackgroundId === defaultTownMapBackgroundId
			? initialStop.door
			: initialMapVariant.startPosition;
	const [activeBackgroundId, setActiveBackgroundId] =
		useState<TownMapBackgroundId>(initialBackgroundId);
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
		createSeedDevDrafts(initialBackgroundId),
	);
	const [draftsHydrated, setDraftsHydrated] = useState(false);
	const [characterPosition, setCharacterPosition] = useState<Position>(
		initialCharacterPosition,
	);
	const [activeStopId, setActiveStopId] = useState<StopId | null>(
		initialStop?.id ?? null,
	);
	const [travelingTo, setTravelingTo] = useState<StopId | null>(null);
	const [characterVisible, setCharacterVisible] = useState(initialStop === null);
	const [skipTravel, setSkipTravel] = useState(false);
	const [lastStopId, setLastStopId] = useState<StopId | null>(
		initialStop?.id ?? null,
	);
	const [exitPassThroughStopId, setExitPassThroughStopId] = useState<StopId | null>(null);
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
	const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
	const [keyboardMoving, setKeyboardMoving] = useState(false);
	const [pathMoving, setPathMoving] = useState(false);
	const [proximitySuppressed, setProximitySuppressed] = useState(false);
	const [facing, setFacing] = useState<"up" | "down" | "left" | "right">("down");
	const [cameraReady, setCameraReady] = useState(false);
	const [showLegacyBackground, setShowLegacyBackground] = useState(false);
	const [dayPhase, setDayPhase] = useState<DayPhase>(libraryQuery.phase ?? "day");
	const [spriteTick, setSpriteTick] = useState(0);
	const [ambientActors, setAmbientActors] = useState<AmbientActorState[]>(() =>
		createAmbientActors(initialBackgroundId),
	);
	const [viewportSize, setViewportSize] = useState(() => ({
		width: initialMapVariant.width,
		height: initialMapVariant.height,
	}));
	const activeMapVariant = useMemo(
		() => getTownMapVariant(activeBackgroundId),
		[activeBackgroundId],
	);
	const guideOpen = libraryQuery.guide === "guide";
	const libraryOpen = libraryQuery.library !== null;
	const librarySelection = useMemo<LibrarySelection | null>(() => {
		if (libraryQuery.library !== "viewer") {
			return null;
		}

		const asset = getSpriteLibraryAssetBySlug(libraryQuery.asset);
		if (!asset) {
			return null;
		}

		return {
			asset,
			modeIndex: clampSpriteLibraryMode(asset, libraryQuery.mode),
		};
	}, [libraryQuery.asset, libraryQuery.library, libraryQuery.mode]);

	const travelFrameRef = useRef<number | null>(null);
	const movementFrameRef = useRef<number | null>(null);
	const movementTimestampRef = useRef<number | null>(null);
	const movementTickRef = useRef<((timestamp: number) => void) | null>(null);
	const pressedKeysRef = useRef<Set<string>>(new Set());
	const positionRef = useRef(initialCharacterPosition);
	const ambientAnimationFrameRef = useRef<number | null>(null);
	const svgRef = useRef<SVGSVGElement | null>(null);
	const viewportRef = useRef<HTMLDivElement | null>(null);
	const backgroundHydratedRef = useRef(false);
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
	const closeLibrary = useCallback(() => {
		void setLibraryQuery({
			asset: null,
			library: null,
			mode: null,
		});
	}, [setLibraryQuery]);
	const openLibrary = useCallback(() => {
		void setLibraryQuery({
			asset: null,
			guide: null,
			library: "open",
			mode: null,
			stop: null,
		});
	}, [setLibraryQuery]);
	const closeGuide = useCallback(() => {
		void setLibraryQuery({
			guide: null,
		});
	}, [setLibraryQuery]);
	const openGuide = useCallback(() => {
		void setLibraryQuery({
			asset: null,
			guide: "guide",
			library: null,
			mode: null,
			stop: null,
		});
	}, [setLibraryQuery]);
	const setLibrarySelection = useCallback((selection: LibrarySelection | null) => {
		if (!selection) {
			void setLibraryQuery({
				asset: null,
				library: "open",
				mode: null,
			});
			return;
		}

		void setLibraryQuery({
			asset: getSpriteLibraryAssetSlug(selection.asset),
			library: "viewer",
			mode: selection.modeIndex > 0 ? selection.modeIndex : null,
		});
	}, [setLibraryQuery]);
	const cycleDayPhase = useCallback(() => {
		setDayPhase((current) => {
			const nextPhase =
				current === "day" ? "dusk" : current === "dusk" ? "night" : "day";
			void setLibraryQuery({
				phase: nextPhase,
			});
			return nextPhase;
		});
	}, [setLibraryQuery]);
	useEffect(() => {
		const syncPhase = () => {
			setDayPhase(
				libraryQuery.phase ?? getDayPhaseForHour(new Date().getHours()),
			);
		};
		const frame = window.requestAnimationFrame(syncPhase);

		if (libraryQuery.phase) {
			return () => window.cancelAnimationFrame(frame);
		}

		const intervalId = window.setInterval(syncPhase, 60_000);

		return () => {
			window.cancelAnimationFrame(frame);
			window.clearInterval(intervalId);
		};
	}, [libraryQuery.phase]);
	useEffect(() => {
		if (libraryQuery.library === "viewer" && !librarySelection) {
			void setLibraryQuery({
				asset: null,
				library: "open",
				mode: null,
			});
		}
	}, [libraryQuery.library, librarySelection, setLibraryQuery]);
	const syncCharacterPosition = useCallback((nextPosition: Position) => {
		setCharacterPosition(nextPosition);
		positionRef.current = nextPosition;
	}, []);
	const resetTownState = useCallback(({
		backgroundId,
		draftsHydrated,
		position,
	}: {
		backgroundId: TownMapBackgroundId;
		draftsHydrated: boolean;
		position: Position;
	}) => {
		cancelCurrentMovement();
		setDragTarget(null);
		setHoveredStopId(null);
		setActiveStopId(null);
		closeLibrary();
		setLastStopId(null);
		setExitPassThroughStopId(null);
		setCharacterVisible(true);
		setProximitySuppressed(false);
		syncCharacterPosition(position);
		setDevDrafts(createSeedDevDrafts(backgroundId));
		setDraftsHydrated(draftsHydrated);
	}, [cancelCurrentMovement, closeLibrary, syncCharacterPosition]);
	const prepareForPlayerTravel = useCallback(() => {
		cancelCurrentMovement();
		closeGuide();
		closeLibrary();
		setCharacterVisible(true);
	}, [cancelCurrentMovement, closeGuide, closeLibrary]);
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
	const shortcutStopIds = useMemo(
		() => new Set<StopId>(["about", "projects", "games", "contact"]),
		[],
	);
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
	const shortcutStops = useMemo(
		() => effectiveStops.filter((stop) => shortcutStopIds.has(stop.id)),
		[effectiveStops, shortcutStopIds],
	);
	const dayPhaseMeta = useMemo(() => {
		if (dayPhase === "night") {
			return {
				label: "Night",
				buttonLabel: "Clock: Night",
				style: {
					background:
						"linear-gradient(180deg, rgba(0, 2, 10, 0.78) 0%, rgba(0, 8, 28, 0.88) 30%, rgba(4, 18, 58, 0.9) 100%), radial-gradient(circle at 18% 14%, rgba(128, 168, 248, 0.08), transparent 22%), radial-gradient(circle at 72% 12%, rgba(0, 136, 248, 0.08), transparent 18%), linear-gradient(180deg, rgba(10, 28, 84, 0.22), rgba(2, 6, 20, 0.58) 100%)",
					mixBlendMode: "multiply" as const,
					opacity: 1,
				},
			};
		}

		if (dayPhase === "dusk") {
			return {
				label: "Dusk",
				buttonLabel: "Clock: Dusk",
				style: {
					background:
						"linear-gradient(180deg, rgba(248, 208, 120, 0.12) 0%, rgba(232, 144, 80, 0.26) 38%, rgba(152, 0, 176, 0.28) 100%), radial-gradient(circle at 50% 0%, rgba(248, 248, 0, 0.12), transparent 24%), linear-gradient(180deg, rgba(88, 88, 40, 0.08), rgba(40, 24, 48, 0.18))",
					mixBlendMode: "multiply" as const,
					opacity: 1,
				},
			};
		}

		return {
			label: "Day",
			buttonLabel: "Clock: Day",
			style: {
				background:
					"radial-gradient(circle at 18% 6%, rgba(248, 248, 248, 0.14), transparent 18%), linear-gradient(180deg, rgba(248, 248, 248, 0.02), rgba(248, 248, 248, 0.08))",
				mixBlendMode: "screen" as const,
				opacity: 0.78,
			},
		};
	}, [dayPhase]);
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

				const queryBackground = libraryQuery.bg;
				const shouldShowLegacy =
					legacyBackgroundEnabled || queryBackground === LEGACY_BACKGROUND_ID;

				setShowLegacyBackground(shouldShowLegacy);
				if (queryBackground) {
					setActiveBackgroundId(queryBackground);
					return;
				}

				if (
					isTownMapBackgroundId(savedBackground) &&
					(shouldShowLegacy || savedBackground !== LEGACY_BACKGROUND_ID)
				) {
					setActiveBackgroundId(savedBackground);
				}
			});

		return () => window.cancelAnimationFrame(frame);
	}, [libraryQuery.bg]);

	useEffect(() => {
		window.localStorage.setItem(
			SHOW_LEGACY_BACKGROUND_STORAGE_KEY,
			String(showLegacyBackground),
		);

		if (
			!showLegacyBackground &&
			activeBackgroundId === LEGACY_BACKGROUND_ID &&
			libraryQuery.bg !== LEGACY_BACKGROUND_ID
		) {
			const frame = window.requestAnimationFrame(() => {
				resetTownState({
					backgroundId: defaultTownMapBackgroundId,
					draftsHydrated: false,
					position: getTownMapVariant(defaultTownMapBackgroundId).startPosition,
				});
				setActiveBackgroundId(defaultTownMapBackgroundId);
				void setLibraryQuery({
					bg: defaultTownMapBackgroundId,
				});
			});

			return () => window.cancelAnimationFrame(frame);
		}
	}, [
		activeBackgroundId,
		libraryQuery.bg,
		resetTownState,
		setLibraryQuery,
		showLegacyBackground,
	]);

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
			const isInitialHydration = !backgroundHydratedRef.current;

			backgroundHydratedRef.current = true;

			if (!isInitialHydration) {
				resetTownState({
					backgroundId: activeBackgroundId,
					draftsHydrated: false,
					position: nextStartPosition,
				});
			}

			if (!rawDrafts) {
				window.localStorage.setItem(ACTIVE_BACKGROUND_STORAGE_KEY, activeBackgroundId);
				setDraftsHydrated(true);
				return;
			}

			try {
				setDevDrafts(
					normalizeDevDrafts(
						JSON.parse(rawDrafts) as Partial<DevMapDrafts>,
						activeBackgroundId,
					),
				);
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
	}, [activeBackgroundId, activeMapVariant.startPosition, resetTownState]);

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
			syncCharacterPosition(finalPoint);
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
				syncCharacterPosition(currentPoint);
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

		resetTownState({
			backgroundId: nextBackgroundId,
			draftsHydrated: false,
			position: getTownMapVariant(nextBackgroundId).startPosition,
		});
		setActiveBackgroundId(nextBackgroundId);
		void setLibraryQuery({
			bg: nextBackgroundId,
		});
	}

	function resetActiveBackgroundDrafts() {
		window.localStorage.removeItem(getDraftStorageKey(activeBackgroundId));
		if (activeBackgroundId === defaultTownMapBackgroundId) {
			window.localStorage.removeItem(DEV_DRAFT_STORAGE_KEY);
		}

		resetTownState({
			backgroundId: activeBackgroundId,
			draftsHydrated: true,
			position: getTownMapVariant(activeBackgroundId).startPosition,
		});
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

	function ensureDoorFxDraft(
		current: DevMapDrafts,
		stopId: StopId,
	): DevDoorFxDraft {
		const existing = current.effects.doorFx[stopId];

		if (existing) {
			return {
				anchor: existing.anchor,
				hidden: existing.hidden ?? false,
				scale: existing.scale ?? 1,
			};
		}

		const stopDraft = ensureStopDraft(current, stopId);

		return {
			anchor: stopDraft.door,
			hidden: false,
			scale: 1,
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

			if (target.type === "effect-door-anchor") {
				const doorFxDraft = ensureDoorFxDraft(current, target.stopId);

				return {
					...current,
					effects: {
						...current.effects,
						doorFx: {
							...current.effects.doorFx,
							[target.stopId]: {
								...doorFxDraft,
								anchor: point,
							},
						},
					},
				};
			}

			if (target.type === "effect-water-corner") {
				const currentWaterArea = current.effects.waterArea ?? {
					start: point,
					end: point,
				};

				return {
					...current,
					effects: {
						...current.effects,
						waterArea: {
							...currentWaterArea,
							[target.corner]: point,
						},
					},
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

			if (devMode === "effect-door") {
				const doorFxDraft = ensureDoorFxDraft(current, devSelectedStopId);

				return {
					...current,
					effects: {
						...current.effects,
						doorFx: {
							...current.effects.doorFx,
							[devSelectedStopId]: {
								...doorFxDraft,
								anchor: point,
							},
						},
					},
				};
			}

			if (devMode === "effect-water") {
				const currentWaterArea = current.effects.waterArea;
				const shouldStartNewArea =
					!currentWaterArea ||
					(currentWaterArea.start.x !== currentWaterArea.end.x ||
						currentWaterArea.start.y !== currentWaterArea.end.y);

				return {
					...current,
					effects: {
						...current.effects,
						waterArea: shouldStartNewArea
							? {
									start: point,
									end: point,
								}
							: {
									start: currentWaterArea.start,
									end: point,
								},
					},
				};
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

			if (devMode === "effect-door") {
				if (!current.effects.doorFx[devSelectedStopId]) {
					return current;
				}

				const nextDoorFx = { ...current.effects.doorFx };
				delete nextDoorFx[devSelectedStopId];

				return {
					...current,
					effects: {
						...current.effects,
						doorFx: nextDoorFx,
					},
				};
			}

			if (devMode === "effect-water") {
				const currentWaterArea = current.effects.waterArea;

				if (!currentWaterArea) {
					return current;
				}

				const shouldClear =
					currentWaterArea.start.x === currentWaterArea.end.x &&
					currentWaterArea.start.y === currentWaterArea.end.y;

				return {
					...current,
					effects: {
						...current.effects,
						waterArea: shouldClear
							? undefined
							: {
									start: currentWaterArea.start,
									end: currentWaterArea.start,
								},
					},
				};
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

			if (devMode === "effect-door") {
				if (!current.effects.doorFx[devSelectedStopId]) {
					return current;
				}

				const nextDoorFx = { ...current.effects.doorFx };
				delete nextDoorFx[devSelectedStopId];

				return {
					...current,
					effects: {
						...current.effects,
						doorFx: nextDoorFx,
					},
				};
			}

			if (devMode === "effect-water") {
				if (!current.effects.waterArea) {
					return current;
				}

				return {
					...current,
					effects: {
						...current.effects,
						waterArea: undefined,
					},
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

	function updateDoorFx(stopId: StopId, updater: (current: DevDoorFxDraft) => DevDoorFxDraft) {
		updateDrafts((current) => ({
			...current,
			effects: {
				...current.effects,
				doorFx: {
					...current.effects.doorFx,
					[stopId]: updater(ensureDoorFxDraft(current, stopId)),
				},
			},
		}));
	}

	function handleDoorFxScaleChange(stopId: StopId, scale: number) {
		updateDoorFx(stopId, (current) => ({
			...current,
			scale,
		}));
	}

	function handleDoorFxHiddenChange(stopId: StopId, hidden: boolean) {
		updateDoorFx(stopId, (current) => ({
			...current,
			hidden,
		}));
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

		if (devMode === "effect-door") {
			const doorFx = devDrafts.effects.doorFx[devSelectedStopId];
			if (doorFx) {
				await copyText(
					JSON.stringify(
						{ effects: { doorFx: { [devSelectedStopId]: doorFx } } },
						null,
						2,
					),
				);
			}
			return;
		}

		if (devMode === "effect-water") {
			if (devDrafts.effects.waterArea) {
				await copyText(
					JSON.stringify(
						{ effects: { waterArea: devDrafts.effects.waterArea } },
						null,
						2,
					),
				);
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

		if (devMode === "effect-water" && devDrafts.effects.waterArea) {
			return [
				devDrafts.effects.waterArea.start,
				devDrafts.effects.waterArea.end,
			];
		}

		return [];
	}, [activePolygonDraft, activeStopDraft, devDrafts.effects.waterArea, devMode]);

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
	const buildStopEntryPath = useCallback((stop: TownStop) => {
		if (isUnsetPosition(stop.exit)) {
			return findPath(
				positionRef.current,
				stop.door,
				stop.id,
				isPlayerNavigablePoint,
			);
		}

		return mergeTravelPaths(
			findPath(
				positionRef.current,
				stop.exit,
				null,
				isPlayerNavigablePoint,
			),
			findPath(
				stop.exit,
				stop.door,
				stop.id,
				isPlayerNavigablePoint,
			),
		);
	}, [findPath, isPlayerNavigablePoint]);
	const buildStopExitPath = useCallback((stop: TownStop) => {
		return findPath(
			stop.door,
			stop.exit,
			stop.id,
			isPlayerNavigablePoint,
		);
	}, [findPath, isPlayerNavigablePoint]);

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
				.filter((actor) => OVERWORLD_AMBIENT_SPRITE_IDS.has(actor.id))
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

		prepareForPlayerTravel();
		const stop = getStop(effectiveStops, stopId);
		if (stop.outline.length < 3 || isUnsetPosition(stop.door)) {
			return;
		}
		setExitPassThroughStopId(null);
		setTravelingTo(stopId);
		const path = buildStopEntryPath(stop);

		runTravel(path, (completed) => {
			setTravelingTo(null);
			if (!completed) {
				return;
			}
			setActiveStopId(stopId);
			setLastStopId(stopId);
			setCharacterVisible(false);
			void setLibraryQuery({
				guide: null,
				stop: stopId,
			});
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
		void setLibraryQuery({
			stop: null,
		});

		const path = buildStopExitPath(stop);

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

		prepareForPlayerTravel();

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
	const sceneSurfaceStyle = useMemo(
		() =>
			cameraReady
				? {
						filter:
							dayPhase === "night"
								? "brightness(0.32) saturate(0.52) contrast(1.04)"
								: dayPhase === "dusk"
									? "brightness(0.84) saturate(1.04) contrast(0.98) sepia(0.14) hue-rotate(-8deg)"
									: "brightness(1) saturate(1)",
						height: activeMapVariant.height,
						transform: sceneTransform,
						transformOrigin: "top left",
						width: activeMapVariant.width,
					}
				: {
						filter:
							dayPhase === "night"
								? "brightness(0.32) saturate(0.52) contrast(1.04)"
								: dayPhase === "dusk"
									? "brightness(0.84) saturate(1.04) contrast(0.98) sepia(0.14) hue-rotate(-8deg)"
									: "brightness(1) saturate(1)",
					},
		[
			activeMapVariant.height,
			activeMapVariant.width,
			cameraReady,
			dayPhase,
			sceneTransform,
		],
	);

	const onEscapeClose = useEffectEvent(() => {
		if (activeStopId) {
			handleCloseStop();
			return;
		}

		if (librarySelection) {
			setLibrarySelection(null);
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

		if (libraryOpen) {
			closeLibrary();
			return;
		}

		if (guideOpen) {
			closeGuide();
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
				libraryOpen ||
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
		libraryOpen,
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
		const movementKeyPressed = isMovementKey(key);

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
			libraryOpen ||
			activeStopId ||
			(editorEnabled && devInteractionMode !== "view")
		) {
			return;
		}

		if (movementKeyPressed && (travelingTo || pathMoving)) {
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
				setFacing(getFacingFromMovementKey(key));
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
			<div
				className="town-page__timewash fixed inset-0 z-5 pointer-events-none"
				style={dayPhaseMeta.style}
			/>

			<main className="relative z-10 h-[100dvh] w-screen overflow-hidden">
				<section className="h-full w-full bg-transparent" aria-label="Pokemon-inspired portfolio town">
					<TownPortfolioChrome
						activeBackgroundId={activeBackgroundId}
						activeStopId={activeStopId}
						availableBackgrounds={availableBackgrounds}
						dayPhaseButtonLabel={dayPhaseMeta.buttonLabel}
						editorEnabled={editorEnabled}
						focusStopId={focusStopId}
						isNightTheme={dayPhase === "night"}
						libraryOpen={libraryOpen}
						onBackgroundChange={handleBackgroundChange}
						onCycleDayPhase={cycleDayPhase}
						onEnterStop={handleEnterStop}
						onOpenGuide={openGuide}
						onOpenLibrary={openLibrary}
						onOpenMapEditor={() => setDevToolOpen(true)}
						shortcutStops={shortcutStops}
						travelingTo={travelingTo}
					/>

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
							style={sceneSurfaceStyle}
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

			<TownGuideDialog
				activeStopId={activeStopId}
				content={content}
				effectiveStops={effectiveStops}
				instantTravel={instantTravel}
				isNightTheme={dayPhase === "night"}
				onClose={closeGuide}
				onEnterStop={handleEnterStop}
				onToggleLegacyBackground={() => setShowLegacyBackground(!showLegacyBackground)}
				onToggleSkipTravel={() => setSkipTravel(!skipTravel)}
				open={guideOpen}
				sceneLabel={sceneLabel}
				showLegacyBackground={showLegacyBackground}
				stops={stops}
			/>

			<TownLibraryDialog
				isNightTheme={dayPhase === "night"}
				onClose={closeLibrary}
				onSelectionChange={setLibrarySelection}
				open={libraryOpen}
				selection={librarySelection}
			/>

			<TownStopDialog
				content={content}
				isNightTheme={dayPhase === "night"}
				onClose={handleCloseStop}
				stop={!guideOpen ? activeStop : null}
			/>

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
					onDoorFxHiddenChange={handleDoorFxHiddenChange}
					onDoorFxScaleChange={handleDoorFxScaleChange}
					onInteractionModeChange={setDevInteractionMode}
					onLayerVisibilityChange={updateLayerVisibility}
					onModeChange={handleDevModeChange}
					onOpenChange={setDevToolOpen}
					onResetBackground={resetActiveBackgroundDrafts}
					onUndoActive={undoDevPoint}
					open={devToolOpen}
					isNightTheme={dayPhase === "night"}
					stops={stops}
					selectedStopId={devSelectedStopId}
					setActiveRegionId={setDevRegionId}
					setSelectedStopId={setDevSelectedStopId}
				/>
			) : null}
		</div>
	);
}
