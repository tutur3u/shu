import type { Position, StopId, TownStop } from "@/lib/portfolio-content";
import type {
	DevLayerVisibility,
	DevPolygonKind,
	DevToolMode,
} from "./map-dev-tool";

export type DragTarget =
	| {
			type: "polygon-point";
			kind: DevPolygonKind;
			id: string;
			index: number;
	  }
	| {
			type: "stop-outline-point";
			stopId: StopId;
			index: number;
	  }
	| {
			type: "stop-anchor";
			stopId: StopId;
			anchor: "infoAnchor" | "door" | "exit";
	  }
	| {
			type: "effect-door-anchor";
			stopId: StopId;
	  }
	| {
			type: "effect-water-corner";
			corner: "start" | "end";
	  };

export function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

export function getStop(stops: TownStop[], stopId: StopId) {
	return stops.find((stop) => stop.id === stopId)!;
}

export function pointsToPolygon(points: Position[]) {
	return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function isPointInPolygon(point: Position, polygon: Position[]) {
	let inside = false;

	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const xi = polygon[i].x;
		const yi = polygon[i].y;
		const xj = polygon[j].x;
		const yj = polygon[j].y;
		const intersects =
			yi > point.y !== yj > point.y &&
			point.x < ((xj - xi) * (point.y - yi)) / (yj - yi || 1e-9) + xi;

		if (intersects) {
			inside = !inside;
		}
	}

	return inside;
}

export function isPolygonMode(mode: DevToolMode): mode is DevPolygonKind {
	return mode === "walkable" || mode === "blocked" || mode === "section";
}

export function getRelevantLayerKeys(
	mode: DevToolMode,
): Array<keyof DevLayerVisibility> {
	if (mode === "all") {
		return ["walkable", "blocked", "sections", "stopOutlines"];
	}

	if (mode === "walkable") {
		return ["walkable", "pointHandles"];
	}

	if (mode === "blocked") {
		return ["blocked", "pointHandles"];
	}

	if (mode === "section") {
		return ["sections", "pointHandles"];
	}

	if (mode === "stop-outline") {
		return ["stopOutlines", "pointHandles"];
	}

	if (mode === "effect-water") {
		return ["stopOutlines", "stopAnchors", "pointHandles"];
	}

	return ["stopOutlines", "stopAnchors"];
}

export function wrapTooltipLines(
	text: string,
	maxChars = 28,
	maxLines = 2,
) {
	const words = text.split(/\s+/);
	const lines: string[] = [];
	let currentLine = "";

	for (const word of words) {
		const candidate = currentLine ? `${currentLine} ${word}` : word;

		if (candidate.length <= maxChars) {
			currentLine = candidate;
			continue;
		}

		if (currentLine) {
			lines.push(currentLine);
		}
		currentLine = word;

		if (lines.length === maxLines - 1) {
			break;
		}
	}

	if (currentLine && lines.length < maxLines) {
		lines.push(currentLine);
	}

	const consumed = lines.join(" ").length;
	if (consumed < text.trim().length && lines.length) {
		lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[. ]+$/, "")}...`;
	}

	return lines;
}
