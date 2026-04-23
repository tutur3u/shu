import {
	mainCharacterAssets,
	npcAssets,
	type PortfolioAsset,
} from "@/lib/asset-catalog";

export type SheetPreviewConfig = {
	columns: number;
	rows: number;
	modes: {
		column?: number;
		label: string;
		row?: number;
	}[];
	animateColumns?: boolean;
	frameDurationMs?: number;
};

export type LibrarySelection = {
	asset: PortfolioAsset;
	modeIndex: number;
};

export const spriteLibraryAssets = [
	...mainCharacterAssets,
	...npcAssets,
] as const satisfies readonly PortfolioAsset[];

export const SHEET_PREVIEW_CONFIGS: Partial<Record<string, SheetPreviewConfig>> = {
	"Bike Idle": {
		columns: 1,
		rows: 4,
		modes: [
			{ label: "Down", row: 0 },
			{ label: "Left", row: 1 },
			{ label: "Up", row: 2 },
			{ label: "Right", row: 3 },
		],
	},
	"Bike Move": {
		columns: 4,
		rows: 4,
		animateColumns: true,
		frameDurationMs: 140,
		modes: [
			{ label: "Down", row: 0 },
			{ label: "Left", row: 1 },
			{ label: "Up", row: 2 },
			{ label: "Right", row: 3 },
		],
	},
	"Lay Down": {
		columns: 2,
		rows: 4,
		animateColumns: true,
		frameDurationMs: 260,
		modes: [
			{ label: "Down", row: 0 },
			{ label: "Left", row: 1 },
			{ label: "Up", row: 2 },
			{ label: "Right", row: 3 },
		],
	},
	Move: {
		columns: 4,
		rows: 4,
		animateColumns: true,
		frameDurationMs: 140,
		modes: [
			{ label: "Down", row: 0 },
			{ label: "Left", row: 1 },
			{ label: "Up", row: 2 },
			{ label: "Right", row: 3 },
		],
	},
	Sit: {
		columns: 1,
		rows: 4,
		modes: [
			{ label: "Down", row: 0 },
			{ label: "Left", row: 1 },
			{ label: "Up", row: 2 },
			{ label: "Right", row: 3 },
		],
	},
	Surf: {
		columns: 2,
		rows: 4,
		animateColumns: true,
		frameDurationMs: 220,
		modes: [
			{ label: "Down", row: 0 },
			{ label: "Left", row: 1 },
			{ label: "Up", row: 2 },
			{ label: "Right", row: 3 },
		],
	},
	Swim: {
		columns: 2,
		rows: 4,
		animateColumns: true,
		frameDurationMs: 220,
		modes: [
			{ label: "Down", row: 0 },
			{ label: "Left", row: 1 },
			{ label: "Up", row: 2 },
			{ label: "Right", row: 3 },
		],
	},
	Wave: {
		columns: 2,
		rows: 1,
		animateColumns: true,
		frameDurationMs: 240,
		modes: [{ label: "Loop", row: 0 }],
	},
	"Creature 1": {
		columns: 2,
		rows: 4,
		animateColumns: true,
		frameDurationMs: 240,
		modes: [
			{ label: "Down", row: 0 },
			{ label: "Left", row: 1 },
			{ label: "Up", row: 2 },
			{ label: "Right", row: 3 },
		],
	},
	"Creature 2": {
		columns: 2,
		rows: 4,
		animateColumns: true,
		frameDurationMs: 240,
		modes: [
			{ label: "Down", row: 0 },
			{ label: "Left", row: 1 },
			{ label: "Up", row: 2 },
			{ label: "Right", row: 3 },
		],
	},
	"Creature 3": {
		columns: 2,
		rows: 4,
		animateColumns: true,
		frameDurationMs: 240,
		modes: [
			{ label: "Down", row: 0 },
			{ label: "Left", row: 1 },
			{ label: "Up", row: 2 },
			{ label: "Right", row: 3 },
		],
	},
	"Creature 4": {
		columns: 2,
		rows: 4,
		animateColumns: true,
		frameDurationMs: 240,
		modes: [
			{ label: "Down", row: 0 },
			{ label: "Left", row: 1 },
			{ label: "Up", row: 2 },
			{ label: "Right", row: 3 },
		],
	},
	"Creature 5": {
		columns: 2,
		rows: 4,
		animateColumns: true,
		frameDurationMs: 240,
		modes: [
			{ label: "Down", row: 0 },
			{ label: "Left", row: 1 },
			{ label: "Up", row: 2 },
			{ label: "Right", row: 3 },
		],
	},
	"NPC 1": {
		columns: 4,
		rows: 4,
		animateColumns: true,
		frameDurationMs: 150,
		modes: [
			{ label: "Down", row: 0 },
			{ label: "Left", row: 1 },
			{ label: "Up", row: 2 },
			{ label: "Right", row: 3 },
		],
	},
	"NPC 2": {
		columns: 4,
		rows: 4,
		animateColumns: true,
		frameDurationMs: 150,
		modes: [
			{ label: "Down", row: 0 },
			{ label: "Left", row: 1 },
			{ label: "Up", row: 2 },
			{ label: "Right", row: 3 },
		],
	},
	"NPC 3": {
		columns: 4,
		rows: 4,
		animateColumns: true,
		frameDurationMs: 150,
		modes: [
			{ label: "Down", row: 0 },
			{ label: "Left", row: 1 },
			{ label: "Up", row: 2 },
			{ label: "Right", row: 3 },
		],
	},
	"NPC 4": {
		columns: 4,
		rows: 4,
		animateColumns: true,
		frameDurationMs: 150,
		modes: [
			{ label: "Down", row: 0 },
			{ label: "Left", row: 1 },
			{ label: "Up", row: 2 },
			{ label: "Right", row: 3 },
		],
	},
	"NPC 5": {
		columns: 4,
		rows: 4,
		animateColumns: true,
		frameDurationMs: 150,
		modes: [
			{ label: "Down", row: 0 },
			{ label: "Left", row: 1 },
			{ label: "Up", row: 2 },
			{ label: "Right", row: 3 },
		],
	},
	"Special NPC 1": {
		columns: 4,
		rows: 4,
		animateColumns: true,
		frameDurationMs: 150,
		modes: [
			{ label: "Down", row: 0 },
			{ label: "Left", row: 1 },
			{ label: "Up", row: 2 },
			{ label: "Right", row: 3 },
		],
	},
	"Special NPC 2": {
		columns: 3,
		rows: 4,
		animateColumns: true,
		frameDurationMs: 180,
		modes: [
			{ label: "Down", row: 0 },
			{ label: "Left", row: 1 },
			{ label: "Up", row: 2 },
			{ label: "Right", row: 3 },
		],
	},
};

const slugifyAssetPath = (asset: PortfolioAsset) =>
	asset.src
		.replace(/^\/assets\/characters\//, "")
		.replace(/\.[^.]+$/, "")
		.replace(/\//g, "-");

const spriteLibraryAssetMap = new Map(
	spriteLibraryAssets.map((asset) => [slugifyAssetPath(asset), asset]),
);

export function getSheetPreviewConfig(asset: PortfolioAsset) {
	return SHEET_PREVIEW_CONFIGS[asset.title] ?? null;
}

export function getSpriteLibraryAssetSlug(asset: PortfolioAsset) {
	return slugifyAssetPath(asset);
}

export function getSpriteLibraryAssetBySlug(slug: string | null | undefined) {
	if (!slug) {
		return null;
	}

	return spriteLibraryAssetMap.get(slug) ?? null;
}

export function getSpriteLibraryModeCount(asset: PortfolioAsset) {
	return getSheetPreviewConfig(asset)?.modes.length ?? 1;
}

export function clampSpriteLibraryMode(
	asset: PortfolioAsset,
	modeIndex: number | null | undefined,
) {
	const maxIndex = getSpriteLibraryModeCount(asset) - 1;
	return Math.max(0, Math.min(modeIndex ?? 0, maxIndex));
}

export function getAdjacentSpriteLibrarySelection(
	selection: LibrarySelection,
	direction: 1 | -1,
): LibrarySelection {
	const currentIndex = spriteLibraryAssets.findIndex(
		(asset) => asset.src === selection.asset.src,
	);

	if (currentIndex === -1) {
		return selection;
	}

	const nextIndex =
		(currentIndex + direction + spriteLibraryAssets.length) %
		spriteLibraryAssets.length;
	const asset = spriteLibraryAssets[nextIndex] ?? selection.asset;

	return {
		asset,
		modeIndex: clampSpriteLibraryMode(asset, selection.modeIndex),
	};
}
