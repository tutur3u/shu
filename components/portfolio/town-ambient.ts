import type { Position, TownMapBackgroundId } from "@/lib/portfolio-content";
import { defaultTownMapBackgroundId } from "@/lib/portfolio-content";
import {
	OVERWORLD_AMBIENT_SPRITES,
} from "./town-map-overlay-sprites";
import type {
	AmbientSpriteActor,
	FacingDirection,
} from "./town-map-overlay-types";

export type AmbientActorState = AmbientSpriteActor & {
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

export const OVERWORLD_AMBIENT_SPRITE_IDS = new Set(
	OVERWORLD_AMBIENT_SPRITES.map((sprite) => sprite.id),
);

export function getFacingFromRow(row = 0): FacingDirection {
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

export function getFacingFromVector(dx: number, dy: number): FacingDirection {
	if (Math.abs(dx) > Math.abs(dy)) {
		return dx >= 0 ? "right" : "left";
	}

	return dy >= 0 ? "down" : "up";
}

export function isStaticAmbientActor(actorId: string) {
	return STATIC_AMBIENT_ACTOR_IDS.has(actorId);
}

export function isConversationalAmbientActor(actorId: string) {
	return !isStaticAmbientActor(actorId) && !actorId.startsWith("creature");
}

export function getAmbientSpeedRange(actorId: string) {
	if (actorId.startsWith("creature")) {
		return { min: 24, max: 40 };
	}

	return { min: 32, max: 56 };
}

export function getAmbientRoamRadius(actorId: string) {
	if (actorId.startsWith("creature")) {
		return 58;
	}

	if (actorId.startsWith("snpc")) {
		return 72;
	}

	return 88;
}

export function getAmbientIdleDurationMs(actorId: string) {
	if (actorId.startsWith("creature")) {
		return 400 + Math.random() * 1000;
	}

	return 700 + Math.random() * 1800;
}

export function getAmbientEmoteDurationMs(actorId: string) {
	if (actorId.startsWith("creature")) {
		return 3800 + Math.random() * 2400;
	}

	return 4200 + Math.random() * 3200;
}

export function getAmbientPostEmoteIdleMs(actorId: string) {
	if (actorId.startsWith("creature")) {
		return 320 + Math.random() * 380;
	}

	return 480 + Math.random() * 520;
}

export function getAmbientFeetPosition(
	actor: Pick<AmbientActorState, "position" | "renderHeight" | "renderWidth">,
): Position {
	return {
		x: actor.position.x + actor.renderWidth / 2,
		y: actor.position.y + actor.renderHeight - 4,
	};
}

export function getAmbientPositionFromFeet(
	feet: Position,
	actor: Pick<AmbientActorState, "renderHeight" | "renderWidth">,
): Position {
	return {
		x: feet.x - actor.renderWidth / 2,
		y: feet.y - actor.renderHeight + 4,
	};
}

export function createAmbientActors(
	backgroundId: TownMapBackgroundId,
): AmbientActorState[] {
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
