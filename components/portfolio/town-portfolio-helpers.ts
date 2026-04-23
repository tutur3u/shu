import {
	defaultTownMapBackgroundId,
	type Position,
	type TownMapBackgroundId,
	townMapVariants,
} from "@/lib/portfolio-content";
import type { DevLayerVisibility, DevToolMode } from "./map-dev-tool";
import { clamp } from "./town-map-utils";
import type { FacingDirection } from "./town-map-overlay-types";

export const ACTIVE_BACKGROUND_STORAGE_KEY = "pokemon-town-active-background";
export const DEV_DRAFT_STORAGE_KEY = "pokemon-town-dev-drafts";
export const SHOW_LEGACY_BACKGROUND_STORAGE_KEY =
	"pokemon-town-show-legacy-background";
export const EMPTY_STOP_POSITION: Position = { x: -9999, y: -9999 };
export const LEGACY_BACKGROUND_ID: TownMapBackgroundId = "background";

export function getOutlineBounds(points: Position[]) {
	const xs = points.map((point) => point.x);
	const ys = points.map((point) => point.y);

	return {
		x: Math.min(...xs),
		y: Math.min(...ys),
		width: Math.max(...xs) - Math.min(...xs),
		height: Math.max(...ys) - Math.min(...ys),
	};
}

export function getDefaultLayerVisibility(
	mode: DevToolMode,
): DevLayerVisibility {
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

export function getDraftStorageKey(backgroundId: TownMapBackgroundId) {
	return `${DEV_DRAFT_STORAGE_KEY}:${backgroundId}`;
}

export function isTownMapBackgroundId(
	value: string | null,
): value is TownMapBackgroundId {
	return townMapVariants.some((background) => background.id === value);
}

export function isLegacyBackgroundEnabled(value: string | null) {
	return value === "true";
}

export function isUnsetPosition(position: Position) {
	return position.x < 0 || position.y < 0;
}

export function getCameraFrame({
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

export function getDistanceToSegment(
	point: Position,
	start: Position,
	end: Position,
) {
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

export function mergeTravelPaths(...segments: Position[][]) {
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
		if (
			Math.hypot(firstPoint.x - lastPoint.x, firstPoint.y - lastPoint.y) >
			0.01
		) {
			merged.push(firstPoint);
		}
		merged.push(...restPoints);
	}

	return merged;
}

export function isMovementKey(key: string) {
	return (
		key === "w" ||
		key === "arrowup" ||
		key === "s" ||
		key === "arrowdown" ||
		key === "a" ||
		key === "arrowleft" ||
		key === "d" ||
		key === "arrowright"
	);
}

export function getFacingFromMovementKey(key: string): FacingDirection {
	if (key === "a" || key === "arrowleft") {
		return "left";
	}

	if (key === "d" || key === "arrowright") {
		return "right";
	}

	if (key === "w" || key === "arrowup") {
		return "up";
	}

	return "down";
}

export function getCharacterTravelSpeed(prefersReducedMotion: boolean) {
	return prefersReducedMotion ? 260 : 205;
}

export { defaultTownMapBackgroundId };
