"use client";

import type { Position } from "@/lib/portfolio-content";

export type FacingDirection = "up" | "down" | "left" | "right";

export type AmbientSpriteDefinition = {
	id: string;
	src: string;
	x: number;
	y: number;
	columns: number;
	rows: number;
	renderWidth: number;
	renderHeight: number;
	row?: number;
	column?: number;
	idleColumn?: number;
	idleFrame?: number;
	walkFrames?: number[];
	animateAxis?: "column" | "row";
	animationFrames?: number;
	animationOffset?: number;
	defaultEmoteVisible?: boolean;
	shadow?: boolean;
	emote?: {
		src: string;
		x: number;
		y: number;
		columns: number;
		rows: number;
		renderWidth: number;
		renderHeight: number;
		animateAxis?: "column" | "row";
		animationFrames?: number;
		animationOffset?: number;
	};
};

export type AmbientSpriteActor = AmbientSpriteDefinition & {
	emoteAnimationMs: number;
	emoteVisible: boolean;
	facing: FacingDirection;
	idleRemainingMs: number;
	moving: boolean;
	position: Position;
	spawn: Position;
	speed: number;
	target: Position | null;
};
