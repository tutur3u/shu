"use client";

import { tileAssets } from "@/lib/asset-catalog";
import type { Position } from "@/lib/portfolio-content";
import { clamp } from "./town-map-utils";
import type { FacingDirection } from "./town-map-overlay-types";

export const TRAINER_SPRITE_PATH = "/assets/characters/main/move.png";
export const TRAINER_SPRITE_RENDER_SIZE = 32;
export const TRAINER_SPRITE_CLIP_ID = "town-trainer-sprite-clip";
export const DOOR_SPRITE_PATH = tileAssets[0].src;
export const WATER_SPRITE_PATH = tileAssets[2].src;
export const DOOR_SPRITE_ROW_COUNT = 7;
export const DOOR_FRAME_SEQUENCE = [0, 2, 4, 6] as const;
export const DOOR_RENDER_WIDTH = 28;
export const DOOR_RENDER_HEIGHT = 36;
export const WATER_TILE_COLUMNS = 6;
export const WATER_TILE_ROWS = 24;

export function getTooltipFrame(
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

export function getOverlayOutlineBounds(points: Position[]) {
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

export function isRenderablePoint(point: Position) {
	return point.x >= 0 && point.y >= 0;
}

export function getEffectWaterRect(waterArea?: {
	start: Position;
	end: Position;
}) {
	if (!waterArea) {
		return null;
	}

	const x = Math.min(waterArea.start.x, waterArea.end.x);
	const y = Math.min(waterArea.start.y, waterArea.end.y);
	const width = Math.max(12, Math.abs(waterArea.end.x - waterArea.start.x));
	const height = Math.max(12, Math.abs(waterArea.end.y - waterArea.start.y));

	return { height, width, x, y };
}

export function getTrainerSpriteRow(facing: FacingDirection) {
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

export function getAnimatedCell({
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

export function getAmbientIdleFrame(idleFrame?: number, idleColumn?: number) {
	if (typeof idleFrame === "number") {
		return idleFrame;
	}

	if (typeof idleColumn === "number") {
		return idleColumn;
	}

	return 0;
}

export function getAmbientWalkFrames(
	columns: number,
	walkFrames?: number[],
	idleFrame?: number,
	idleColumn?: number,
) {
	if (walkFrames && walkFrames.length > 0) {
		return walkFrames;
	}

	const resolvedIdleFrame = getAmbientIdleFrame(idleFrame, idleColumn);

	if (columns >= 4) {
		return [resolvedIdleFrame, 1, resolvedIdleFrame, 3].filter(
			(frame) => frame >= 0 && frame < columns,
		);
	}

	if (columns === 3) {
		return [0, 1, 2, 1];
	}

	if (columns === 2) {
		return [0, 1];
	}

	return [resolvedIdleFrame];
}

export function getOneShotRowCell({
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
