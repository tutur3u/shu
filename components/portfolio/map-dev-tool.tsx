"use client";

import { useMemo, useState } from "react";
import {
	defaultTownMapBackgroundId,
	type Position,
	type StopId,
	type TownMapBackgroundId,
} from "@/lib/portfolio-content";

export type DevPolygonKind = "walkable" | "blocked" | "section";
export type DevToolMode =
	| "all"
	| DevPolygonKind
	| "stop-outline"
	| "stop-info"
	| "stop-door"
	| "stop-exit";

export type DevInteractionMode = "view" | "capture" | "move";

export type DevLayerVisibility = {
	walkable: boolean;
	blocked: boolean;
	sections: boolean;
	stopOutlines: boolean;
	stopAnchors: boolean;
	pointHandles: boolean;
};

export type DevPolygonDraft = {
	id: string;
	kind: DevPolygonKind;
	points: Position[];
};

export type DevStopDraft = Partial<{
	outline: Position[];
	infoAnchor: Position;
	door: Position;
	exit: Position;
}>;

export type DevMapDrafts = {
	polygons: DevPolygonDraft[];
	stops: Partial<Record<StopId, DevStopDraft>>;
};

const DEFAULT_BACKGROUND_POLYGONS: DevPolygonDraft[] = [
	{
		id: "walkable-main",
		kind: "walkable",
		points: [
			{ x: 546.3756713867188, y: 22.96924591064453 },
			{ x: 544.2189331054688, y: 142.30918884277344 },
			{ x: 433.5059509277344, y: 138.71461486816406 },
			{ x: 426.3168029785156, y: 176.0982208251953 },
			{ x: 366.6468200683594, y: 175.37930297851562 },
			{ x: 363.1252746582031, y: 136.66458129882812 },
			{ x: 195.43826293945312, y: 137.81317138671875 },
			{ x: 194.0846710205078, y: 173.54269409179688 },
			{ x: 128.68585205078125, y: 176.0982208251953 },
			{ x: 131.4070587158203, y: 325.447265625 },
			{ x: 161.76998901367188, y: 325.5989074707031 },
			{ x: 160.318115234375, y: 427.7185974121094 },
			{ x: 127.96693420410156, y: 432.0320739746094 },
			{ x: 128.68585205078125, y: 475.1669921875 },
			{ x: 158.8802947998047, y: 474.4480895996094 },
			{ x: 158.8802947998047, y: 516.1451416015625 },
			{ x: 186.19908142089844, y: 517.5830078125 },
			{ x: 186.91798400878906, y: 475.88592529296875 },
			{ x: 225.8826446533203, y: 475.0686950683594 },
			{ x: 224.3015899658203, y: 517.5830078125 },
			{ x: 259.5284423828125, y: 520.4586791992188 },
			{ x: 258.0906066894531, y: 562.8746948242188 },
			{ x: 440.6950988769531, y: 565.0314331054688 },
			{ x: 442.8518371582031, y: 519.73974609375 },
			{ x: 602.4510498046875, y: 514.7073364257812 },
			{ x: 608.9213256835938, y: 563.5935668945312 },
			{ x: 894.1902465820312, y: 566.2642211914062 },
			{ x: 895.0496215820312, y: 519.0208129882812 },
			{ x: 925.2440185546875, y: 518.3019409179688 },
			{ x: 928.838623046875, y: 468.6967468261719 },
			{ x: 955.4384765625, y: 469.4156799316406 },
			{ x: 954.0006713867188, y: 376.67559814453125 },
			{ x: 922.1746215820312, y: 376.2319030761719 },
			{ x: 923.0872802734375, y: 285.37335205078125 },
			{ x: 893.6117553710938, y: 286.8111877441406 },
			{ x: 892.8928833007812, y: 238.6438446044922 },
			{ x: 925.2440185546875, y: 234.33035278320312 },
			{ x: 924.716064453125, y: 180.71780395507812 },
			{ x: 795.1568603515625, y: 180.53245544433594 },
			{ x: 793.6825561523438, y: 142.30918884277344 },
			{ x: 639.8346557617188, y: 141.59027099609375 },
			{ x: 603.1699829101562, y: 141.59027099609375 },
			{ x: 601.7321166992188, y: 23.688161849975586 },
		],
	},
	{
		id: "walkable-main",
		kind: "blocked",
		points: [
			{ x: 189.1786346435547, y: 230.91551208496094 },
			{ x: 189.7936553955078, y: 295.43817138671875 },
			{ x: 370.8985290527344, y: 294.74169921875 },
			{ x: 370.0616760253906, y: 216.55685424804688 },
			{ x: 315.6684265136719, y: 168.0188446044922 },
			{ x: 197.2552032470703, y: 188.69607543945312 },
		],
	},
	{
		id: "blocked-2",
		kind: "blocked",
		points: [
			{ x: 447.4630126953125, y: 267.9986267089844 },
			{ x: 450.5352478027344, y: 348.58453369140625 },
			{ x: 488.8624267578125, y: 337.8541564941406 },
			{ x: 489.58135986328125, y: 349.3568115234375 },
			{ x: 538.4675903320312, y: 347.9189758300781 },
			{ x: 542.7810668945312, y: 269.5572204589844 },
			{ x: 517.6190185546875, y: 258.7734680175781 },
			{ x: 471.60845947265625, y: 258.0545654296875 },
		],
	},
	{
		id: "blocked-3",
		kind: "blocked",
		points: [
			{ x: 657.8075561523438, y: 185.44410705566406 },
			{ x: 658.5264282226562, y: 252.30323791503906 },
			{ x: 722.5099487304688, y: 256.6167297363281 },
			{ x: 730.41796875, y: 188.3197784423828 },
			{ x: 693.7532958984375, y: 170.34689331054688 },
		],
	},
	{
		id: "blocked-4",
		kind: "blocked",
		points: [
			{ x: 818.1256713867188, y: 173.22254943847656 },
			{ x: 817.40673828125, y: 240.80059814453125 },
			{ x: 856.2281494140625, y: 240.80059814453125 },
			{ x: 857.666015625, y: 250.86541748046875 },
			{ x: 890.0172119140625, y: 251.58432006835938 },
			{ x: 909.4279174804688, y: 245.8330078125 },
			{ x: 910.86572265625, y: 175.37930297851562 },
			{ x: 885.7036743164062, y: 164.59556579589844 },
			{ x: 838.9741821289062, y: 164.59556579589844 },
		],
	},
	{
		id: "blocked-5",
		kind: "blocked",
		points: [
			{ x: 242.99339294433594, y: 411.18353271484375 },
			{ x: 242.99339294433594, y: 480.9183349609375 },
			{ x: 308.4146728515625, y: 479.4804992675781 },
			{ x: 312.7281799316406, y: 414.7781066894531 },
			{ x: 305.5390319824219, y: 401.837646484375 },
			{ x: 278.2202453613281, y: 395.3674011230469 },
		],
	},
	{
		id: "blocked-6",
		kind: "blocked",
		points: [
			{ x: 562.9107055664062, y: 426.9996643066406 },
			{ x: 563.629638671875, y: 493.139892578125 },
			{ x: 629.0509033203125, y: 496.0155334472656 },
			{ x: 632.5331420898438, y: 424.8260803222656 },
			{ x: 597.4186401367188, y: 411.18353271484375 },
		],
	},
	{
		id: "blocked-7",
		kind: "blocked",
		points: [
			{ x: 690.1587524414062, y: 329.94610595703125 },
			{ x: 691.5965576171875, y: 398.96197509765625 },
			{ x: 755.5800170898438, y: 399.6808776855469 },
			{ x: 762.05029296875, y: 334.978515625 },
			{ x: 726.8234252929688, y: 313.4110412597656 },
		],
	},
	{
		id: "blocked-8",
		kind: "blocked",
		points: [
			{ x: 800.8717041015625, y: 460.7886962890625 },
			{ x: 804.4662475585938, y: 526.9288940429688 },
			{ x: 841.1309814453125, y: 526.9288940429688 },
			{ x: 841.1309814453125, y: 543.4639282226562 },
			{ x: 891.4550170898438, y: 541.3071899414062 },
			{ x: 894.3306884765625, y: 464.3832702636719 },
			{ x: 872.0443115234375, y: 453.59954833984375 },
			{ x: 824.5537719726562, y: 453.12774658203125 },
		],
	},
	{
		id: "blocked-9",
		kind: "blocked",
		points: [
			{ x: 755.5800170898438, y: 402.5565490722656 },
			{ x: 755.5800170898438, y: 434.1888122558594 },
			{ x: 771.3961791992188, y: 450.0049743652344 },
			{ x: 789.3690185546875, y: 465.1021728515625 },
			{ x: 803.7473754882812, y: 470.853515625 },
			{ x: 904.3955078125, y: 483.7939758300781 },
			{ x: 911.5846557617188, y: 452.880615234375 },
			{ x: 940.3412475585938, y: 452.880615234375 },
			{ x: 938.9034423828125, y: 417.6537780761719 },
			{ x: 908.708984375, y: 416.9348449707031 },
			{ x: 910.86572265625, y: 370.2053527832031 },
			{ x: 892.1739501953125, y: 365.8918762207031 },
			{ x: 892.1739501953125, y: 340.01092529296875 },
			{ x: 910.1468505859375, y: 340.7298278808594 },
			{ x: 911.5846557617188, y: 305.50299072265625 },
			{ x: 836.0985717773438, y: 304.0651550292969 },
			{ x: 833.222900390625, y: 320.6001892089844 },
			{ x: 801.5906372070312, y: 320.6001892089844 },
			{ x: 798.7149658203125, y: 366.61077880859375 },
			{ x: 769.9583129882812, y: 368.76751708984375 },
			{ x: 769.2394409179688, y: 396.80523681640625 },
		],
	},
];

const BACKGROUND_2_SEED_DRAFTS: DevMapDrafts = {
	polygons: [
		{
			id: "walkable-1",
			kind: "walkable",
			points: [
				{ x: 126.64550018310547, y: 84.65608215332031 },
				{ x: 896, y: 86.01058197021484 },
				{ x: 905.4100341796875, y: 857.9983520507812 },
				{ x: 127.65608215332031, y: 856.1041870117188 },
			],
		},
	],
	stops: {
		about: {
			outline: [
				{ x: 470.0105895996094, y: 171.3439178466797 },
				{ x: 427.3439025878906, y: 173.3756561279297 },
				{ x: 427.3439025878906, y: 148.3174591064453 },
				{ x: 388.0635070800781, y: 129.3544921875 },
				{ x: 252.61375427246094, y: 130.03175354003906 },
				{ x: 212.6560821533203, y: 148.9947052001953 },
				{ x: 211.9788360595703, y: 339.97882080078125 },
				{ x: 466.62432861328125, y: 339.97882080078125 },
				{ x: 470.6878356933594, y: 173.3756561279297 },
			],
			door: { x: 362.3280334472656, y: 319.3584289550781 },
			exit: { x: 361.6507873535156, y: 364.05682373046875 },
		},
		projects: {
			outline: [
				{ x: 554.6666870117188, y: 147.6402130126953 },
				{ x: 554.6666870117188, y: 338.62432861328125 },
				{ x: 811.3439331054688, y: 341.3333435058594 },
				{ x: 812.0211791992188, y: 158.4761962890625 },
				{ x: 791.7036743164062, y: 128 },
				{ x: 766.6455078125, y: 145.60845947265625 },
				{ x: 726.0105590820312, y: 127.32275390625 },
				{ x: 594.6243286132812, y: 126.64550018310547 },
				{ x: 553.3121948242188, y: 148.9947052001953 },
			],
			door: { x: 703.661376953125, y: 319.3584289550781 },
			exit: { x: 704.338623046875, y: 365.4113464355469 },
		},
		games: {
			outline: [
				{ x: 553.9894409179688, y: 467.8277587890625 },
				{ x: 553.3121948242188, y: 679.1293334960938 },
				{ x: 642.03173828125, y: 681.1610717773438 },
				{ x: 639.32275390625, y: 595.1505126953125 },
				{ x: 682.6666870117188, y: 595.8277587890625 },
				{ x: 680.6349487304688, y: 511.8489074707031 },
				{ x: 704.338623046875, y: 509.8171691894531 },
				{ x: 704.338623046875, y: 531.4891357421875 },
				{ x: 726.0105590820312, y: 555.8700561523438 },
				{ x: 764.61376953125, y: 551.1293334960938 },
				{ x: 761.2275390625, y: 501.690185546875 },
				{ x: 791.7036743164062, y: 513.2034301757812 },
				{ x: 788.9946899414062, y: 645.9441528320312 },
				{ x: 761.90478515625, y: 646.6213989257812 },
				{ x: 766.6455078125, y: 598.5367431640625 },
				{ x: 726.0105590820312, y: 596.5050048828125 },
				{ x: 720.5925903320312, y: 640.5261840820312 },
				{ x: 681.9894409179688, y: 646.6213989257812 },
				{ x: 681.9894409179688, y: 680.4838256835938 },
				{ x: 811.3439331054688, y: 680.4838256835938 },
				{ x: 809.3121948242188, y: 469.1822509765625 },
				{ x: 553.3121948242188, y: 468.5050048828125 },
			],
			door: { x: 661.6719360351562, y: 618.0250854492188 },
			exit: { x: 662.3491821289062, y: 697.26318359375 },
		},
		contact: {
			outline: [
				{ x: 425.9894104003906, y: 551.8065795898438 },
				{ x: 258.03173828125, y: 555.1928100585938 },
				{ x: 253.96824645996094, y: 719.7642822265625 },
				{ x: 424.6349182128906, y: 719.0870361328125 },
				{ x: 425.3121643066406, y: 552.4838256835938 },
			],
			door: { x: 343.3650817871094, y: 563.506591796875 },
			exit: { x: 344.7195739746094, y: 534.3848876953125 },
		},
	},
};

const POLYGON_LABELS: Record<DevPolygonKind, string> = {
	walkable: "Walkable",
	blocked: "Blocked",
	section: "Section",
};

const MODE_DESCRIPTIONS: Record<DevToolMode, { title: string; body: string }> = {
	all: {
		title: "Preview Mode",
		body: "Shows the portfolio the way visitors should read it: clean navigation outlines first, editing layers only if you opt into them.",
	},
	walkable: {
		title: "Walkable Zones",
		body: "Define where the trainer is allowed to move freely. Use multiple zones to stitch together roads, plazas, and open ground.",
	},
	blocked: {
		title: "Blocked Zones",
		body: "Mark trees, water, walls, and other areas that should reject movement even when they sit inside a larger walkable field.",
	},
	section: {
		title: "Section Zones",
		body: "Group larger map regions for debugging, routing, or future narrative overlays without changing the navigation affordances.",
	},
	"stop-outline": {
		title: "Stop Outlines",
		body: "Trace the clickable border for a destination. These are the dashed shapes visitors hover to discover and enter each room.",
	},
	"stop-info": {
		title: "Info Anchor",
		body: "Place the tooltip anchor for a stop. Keep it near the building, but leave enough room so the label stays readable.",
	},
	"stop-door": {
		title: "Door Node",
		body: "This is the entrance target. The trainer walks here before opening the room, so place it at the exact doorway.",
	},
	"stop-exit": {
		title: "Exit Node",
		body: "This is the spawn point after closing a room. Keep it on a sensible piece of walkable ground just outside the building.",
	},
};

const INTERACTION_DESCRIPTIONS: Record<
	DevInteractionMode,
	{ title: string; body: string }
> = {
	view: {
		title: "View",
		body: "Browse the map like a visitor. Hover still reveals destination info, and clicks still open rooms.",
	},
	capture: {
		title: "Capture",
		body: "Add new points to the current zone or stop target. Use this only in a specific editing mode, not in All Layers.",
	},
	move: {
		title: "Move",
		body: "Drag existing handles into place without adding more points. Best for polishing outlines, anchors, and travel nodes.",
	},
};

function isPolygonMode(mode: DevToolMode): mode is DevPolygonKind {
	return mode === "walkable" || mode === "blocked" || mode === "section";
}

function getRelevantLayers(mode: DevToolMode) {
	if (mode === "all") {
		return [
			{ key: "walkable", label: "Walkable zones" },
			{ key: "blocked", label: "Blocked zones" },
			{ key: "sections", label: "Section zones" },
			{ key: "stopOutlines", label: "Stop outlines" },
		] as const;
	}

	if (mode === "walkable") {
		return [
			{ key: "walkable", label: "Walkable zones" },
			{ key: "pointHandles", label: "Point handles" },
		] as const;
	}

	if (mode === "blocked") {
		return [
			{ key: "blocked", label: "Blocked zones" },
			{ key: "pointHandles", label: "Point handles" },
		] as const;
	}

	if (mode === "section") {
		return [
			{ key: "sections", label: "Section zones" },
			{ key: "pointHandles", label: "Point handles" },
		] as const;
	}

	if (mode === "stop-outline") {
		return [
			{ key: "stopOutlines", label: "Stop outline" },
			{ key: "pointHandles", label: "Point handles" },
		] as const;
	}

	return [
		{ key: "stopOutlines", label: "Stop outline" },
		{ key: "stopAnchors", label: "Anchors" },
	] as const;
}

function formatPosition(position: Position) {
	return `{ x: ${Math.round(position.x)}, y: ${Math.round(position.y)} }`;
}

function formatPositions(points: Position[]) {
	return `[\n${points.map((point) => `\t${formatPosition(point)},`).join("\n")}\n]`;
}

export function createEmptyDevDrafts(): DevMapDrafts {
	return {
		polygons: [],
		stops: {},
	};
}

export function createSeedDevDrafts(
	backgroundId: TownMapBackgroundId = defaultTownMapBackgroundId,
): DevMapDrafts {
	if (backgroundId === defaultTownMapBackgroundId) {
		return {
			polygons: DEFAULT_BACKGROUND_POLYGONS.map((entry) => ({
				...entry,
				points: entry.points.map((point) => ({ ...point })),
			})),
			stops: {},
		};
	}

	if (backgroundId === "background-2") {
		return {
			polygons: BACKGROUND_2_SEED_DRAFTS.polygons.map((entry) => ({
				...entry,
				points: entry.points.map((point) => ({ ...point })),
			})),
			stops: Object.fromEntries(
				Object.entries(BACKGROUND_2_SEED_DRAFTS.stops).map(([stopId, stopDraft]) => [
					stopId,
					{
						...stopDraft,
						outline: stopDraft?.outline?.map((point) => ({ ...point })),
						door: stopDraft?.door ? { ...stopDraft.door } : undefined,
						exit: stopDraft?.exit ? { ...stopDraft.exit } : undefined,
						infoAnchor: stopDraft?.infoAnchor
							? { ...stopDraft.infoAnchor }
							: undefined,
					},
				]),
			) as DevMapDrafts["stops"],
		};
	}

	return createEmptyDevDrafts();
}

export function MapDevTool({
	activeBackgroundId,
	activeRegionId,
	backgrounds,
	drafts,
	interactionMode,
	layerVisibility,
	mode,
	onBackgroundChange,
	onClearActive,
	onCopyActive,
	onCopyAll,
	onCreatePolygonZone,
	onDeleteActivePolygonZone,
	onInteractionModeChange,
	onLayerVisibilityChange,
	onModeChange,
	onOpenChange,
	onResetBackground,
	onUndoActive,
	open,
	stops,
	selectedStopId,
	setActiveRegionId,
	setSelectedStopId,
}: {
	activeBackgroundId: TownMapBackgroundId;
	activeRegionId: string;
	backgrounds: Array<{ id: TownMapBackgroundId; label: string }>;
	drafts: DevMapDrafts;
	interactionMode: DevInteractionMode;
	layerVisibility: DevLayerVisibility;
	mode: DevToolMode;
	onBackgroundChange: (nextBackgroundId: TownMapBackgroundId) => void;
	onClearActive: () => void;
	onCopyActive: () => void;
	onCopyAll: () => void;
	onCreatePolygonZone: () => void;
	onDeleteActivePolygonZone: () => void;
	onInteractionModeChange: (nextMode: DevInteractionMode) => void;
	onLayerVisibilityChange: <K extends keyof DevLayerVisibility>(
		layer: K,
		value: DevLayerVisibility[K],
	) => void;
	onModeChange: (nextMode: DevToolMode) => void;
	onOpenChange: (nextOpen: boolean) => void;
	onResetBackground: () => void;
	onUndoActive: () => void;
	open: boolean;
	stops: { id: StopId }[];
	selectedStopId: StopId;
	setActiveRegionId: (nextId: string) => void;
	setSelectedStopId: (nextStopId: StopId) => void;
}) {
	const [copiedLabel, setCopiedLabel] = useState<"active" | "all" | null>(null);
	const polygonZones = useMemo(
		() =>
			isPolygonMode(mode)
				? drafts.polygons.filter((entry) => entry.kind === mode)
				: [],
		[drafts.polygons, mode],
	);
	const visibleLayers = useMemo(() => getRelevantLayers(mode), [mode]);
	const modeDescription = MODE_DESCRIPTIONS[mode];
	const interactionDescription = INTERACTION_DESCRIPTIONS[interactionMode];

	const activeSummary = useMemo(() => {
		if (mode === "all") {
			return `${drafts.polygons.length} polygon zones, ${Object.keys(drafts.stops).length} customized stops`;
		}

		if (isPolygonMode(mode)) {
			const polygon = drafts.polygons.find(
				(entry) => entry.kind === mode && entry.id === activeRegionId,
			);

			if (!polygon) {
				return `No ${mode} polygon yet.`;
			}

			return `${polygon.points.length} points in ${polygon.kind}:${polygon.id}`;
		}

		const stopDraft = drafts.stops[selectedStopId];

		if (mode === "stop-outline") {
			const count = stopDraft?.outline?.length ?? 0;
			return count ? `${count} outline points for ${selectedStopId}` : `No outline points for ${selectedStopId}`;
		}

		if (mode === "stop-info") {
			return stopDraft?.infoAnchor
				? `Info anchor for ${selectedStopId}: ${formatPosition(stopDraft.infoAnchor)}`
				: `No info anchor for ${selectedStopId}`;
		}

		if (mode === "stop-door") {
			return stopDraft?.door
				? `Door for ${selectedStopId}: ${formatPosition(stopDraft.door)}`
				: `No door point for ${selectedStopId}`;
		}

		return stopDraft?.exit
			? `Exit for ${selectedStopId}: ${formatPosition(stopDraft.exit)}`
			: `No exit point for ${selectedStopId}`;
	}, [activeRegionId, drafts, mode, selectedStopId]);

	const activeSnippet = useMemo(() => {
		if (mode === "all") {
			return JSON.stringify(drafts, null, 2);
		}

		if (isPolygonMode(mode)) {
			const polygon = drafts.polygons.find(
				(entry) => entry.kind === mode && entry.id === activeRegionId,
			);

			if (!polygon) {
				return "// Click the map to create a polygon draft.";
			}

			return `{
\tid: "${polygon.id}",
\tkind: "${polygon.kind}",
\tpoints: ${formatPositions(polygon.points)},
}`;
		}

		const stopDraft = drafts.stops[selectedStopId];

		if (mode === "stop-outline") {
			return stopDraft?.outline?.length
				? `${selectedStopId}: {\n\toutline: ${formatPositions(stopDraft.outline)},\n}`
				: `// Click the map to define ${selectedStopId} outline points.`;
		}

		if (mode === "stop-info") {
			return stopDraft?.infoAnchor
				? `${selectedStopId}: {\n\tinfoAnchor: ${formatPosition(stopDraft.infoAnchor)},\n}`
				: `// Click the map to place the ${selectedStopId} info anchor.`;
		}

		if (mode === "stop-door") {
			return stopDraft?.door
				? `${selectedStopId}: {\n\tdoor: ${formatPosition(stopDraft.door)},\n}`
				: `// Click the map to place the ${selectedStopId} door.`;
		}

		return stopDraft?.exit
			? `${selectedStopId}: {\n\texit: ${formatPosition(stopDraft.exit)},\n}`
			: `// Click the map to place the ${selectedStopId} exit.`;
	}, [activeRegionId, drafts, mode, selectedStopId]);

	if (!open) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-6 backdrop-blur-md"
			role="presentation"
			onClick={() => onOpenChange(false)}
		>
			<section
				className="pokedex-box flex w-[min(800px,calc(100vw-2rem))] max-h-[min(92vh,960px)] flex-col gap-6 overflow-auto p-8 scrollbar-thin"
				role="dialog"
				aria-modal="true"
				aria-labelledby="dev-map-tool-title"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="flex items-center justify-between gap-4 border-b border-line/10 pb-4">
					<div>
						<p className="pixel-eyebrow">Development Overlay</p>
						<h2 className="m-0 font-dot-gothic text-2xl leading-tight" id="dev-map-tool-title">Map Editor</h2>
					</div>
					<button className="pixel-button px-4 py-2 text-sm" type="button" onClick={() => onOpenChange(false)}>
						Close
					</button>
				</div>

				<div className="flex flex-col gap-6">
					<label className="flex flex-col gap-2">
						<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">Background</span>
						<select
							className="pixel-card bg-white p-3 font-dot-gothic text-lg outline-none focus:border-accent"
							value={activeBackgroundId}
							onChange={(event) =>
								onBackgroundChange(event.target.value as TownMapBackgroundId)
							}
						>
							{backgrounds.map((background) => (
								<option key={background.id} value={background.id}>
									{background.label}
								</option>
							))}
						</select>
					</label>

					<label className="flex flex-col gap-2">
						<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">Mode</span>
						<select
							className="pixel-card bg-white p-3 font-dot-gothic text-lg outline-none focus:border-accent"
							value={mode}
							onChange={(event) => onModeChange(event.target.value as DevToolMode)}
						>
							<option value="all">All Layers</option>
							<option value="walkable">Walkable Polygon</option>
							<option value="blocked">Blocked Polygon</option>
							<option value="section">Section Polygon</option>
							<option value="stop-outline">Stop Outline</option>
							<option value="stop-info">Stop Info Anchor</option>
							<option value="stop-door">Stop Door</option>
							<option value="stop-exit">Stop Exit</option>
						</select>
					</label>

					<div className="pixel-card border-line-soft bg-white/60 p-4">
						<strong className="font-dot-gothic text-base uppercase tracking-wide">{modeDescription.title}</strong>
						<p className="m-0 mt-1 text-lg leading-snug text-ink-soft">{modeDescription.body}</p>
					</div>

					<div className="flex flex-col gap-4">
						<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">Interaction</span>
						<div className="grid grid-cols-3 gap-3">
							{(["view", "capture", "move"] as DevInteractionMode[]).map((intMode) => (
								<button
									key={intMode}
									type="button"
									className={`pixel-button py-2 text-sm ${
										interactionMode === intMode ? "bg-accent" : "bg-panel-strong"
									}`}
									onClick={() => onInteractionModeChange(intMode)}
									disabled={intMode === "capture" && mode === "all"}
								>
									{intMode}
								</button>
							))}
						</div>
						<div className="pixel-card border-line-soft bg-white/40 p-4">
							<strong className="font-dot-gothic text-base uppercase tracking-wide">{interactionDescription.title}</strong>
							<p className="m-0 mt-1 text-lg leading-snug text-ink-soft">{interactionDescription.body}</p>
						</div>
					</div>

					{mode === "all" ? (
						<div className="pixel-card bg-white/40 p-5 text-center">
							<p className="m-0 text-lg leading-relaxed text-ink-soft">
								All Layers acts like a polished preview by default. Editing layers stay off until manually toggled below.
							</p>
						</div>
					) : isPolygonMode(mode) ? (
						<div className="flex flex-col gap-4">
							<div className="flex items-center justify-between gap-4">
								<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">{POLYGON_LABELS[mode]} zones</span>
								<div className="flex gap-2">
									<button className="pixel-button bg-sky px-3 py-1 text-xs" type="button" onClick={onCreatePolygonZone}>
										New
									</button>
									<button
										className="pixel-button bg-line px-3 py-1 text-xs text-white"
										type="button"
										onClick={onDeleteActivePolygonZone}
										disabled={!polygonZones.some((entry) => entry.id === activeRegionId)}
									>
										Del
									</button>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3">
								{polygonZones.length ? (
									polygonZones.map((entry) => (
										<button
											type="button"
											key={`${entry.kind}-${entry.id}`}
											className={`pixel-card flex items-center justify-between px-4 py-2 text-left ${
												entry.id === activeRegionId ? "border-accent bg-accent/20" : "bg-white/40"
											}`}
											onClick={() => setActiveRegionId(entry.id)}
										>
											<strong className="text-sm">{entry.id}</strong>
											<span className="font-dot-gothic text-xs text-ink-soft">{entry.points.length} pts</span>
										</button>
									))
								) : (
									<p className="col-span-2 py-4 text-center text-lg text-ink-soft">No {mode} zones yet.</p>
								)}
							</div>

							<label className="flex flex-col gap-2">
								<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">Zone ID</span>
								<input
									className="pixel-card bg-white p-3 font-dot-gothic text-lg outline-none focus:border-accent"
									type="text"
									value={activeRegionId}
									onChange={(event) => setActiveRegionId(event.target.value)}
									placeholder={`${mode}-main`}
								/>
							</label>
						</div>
					) : (
						<label className="flex flex-col gap-2">
							<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">Stop</span>
							<select
								className="pixel-card bg-white p-3 font-dot-gothic text-lg outline-none focus:border-accent"
								value={selectedStopId}
								onChange={(event) => setSelectedStopId(event.target.value as StopId)}
							>
								{stops.map((stop) => (
									<option key={stop.id} value={stop.id}>
										{stop.id}
									</option>
								))}
							</select>
						</label>
					)}

					<div className="flex flex-col gap-4">
						<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">Visibility</span>
						<div className="grid grid-cols-2 gap-4">
							{visibleLayers.map((layer) => (
								<label className="pixel-card flex items-center gap-3 bg-white/40 p-3" key={layer.key}>
									<input
										className="h-5 w-5 accent-accent"
										type="checkbox"
										checked={layerVisibility[layer.key]}
										onChange={(event) =>
											onLayerVisibilityChange(layer.key, event.target.checked)
										}
									/>
									<span className="font-dot-gothic text-sm uppercase tracking-tight">{layer.label}</span>
								</label>
							))}
						</div>
					</div>

					<p className="m-0 text-center font-dot-gothic text-base tracking-wide text-accent-strong">{activeSummary}</p>

					<div className="grid grid-cols-2 gap-4">
						{[
							{ label: "Undo", action: onUndoActive, color: "bg-panel-strong" },
							{ label: "Clear", action: onClearActive, color: "bg-panel-strong" },
							{
								label: copiedLabel === "active" ? "Copied!" : "Copy Active",
								action: () => {
									onCopyActive();
									setCopiedLabel("active");
									window.setTimeout(() => setCopiedLabel(null), 1200);
								},
								color: "bg-accent"
							},
							{
								label: copiedLabel === "all" ? "Copied!" : "Copy All",
								action: () => {
									onCopyAll();
									setCopiedLabel("all");
									window.setTimeout(() => setCopiedLabel(null), 1200);
								},
								color: "bg-accent"
							}
						].map((btn) => (
							<button
								key={btn.label}
								type="button"
								className={`pixel-button py-3 text-sm ${btn.color}`}
								onClick={btn.action}
							>
								{btn.label}
							</button>
						))}
					</div>

					<button
						type="button"
						className="pixel-button bg-line py-3 text-sm text-white"
						onClick={onResetBackground}
					>
						Reset This Background
					</button>

					<div className="flex flex-col gap-4">
						<p className="m-0 border-l-4 border-line/20 pl-4 text-base italic leading-snug text-ink-soft">
							{interactionMode === "capture"
								? "Click on the map to add points or place anchors. Existing handles stay hidden while drawing."
								: interactionMode === "move"
									? "Drag visible handles directly on the map to reposition them."
									: "View mode leaves the map interactive while keeping editor overlays visible."}
						</p>
						<textarea
							className="pixel-card mt-2 min-h-[240px] bg-ink/5 p-4 font-mono text-xs leading-relaxed"
							readOnly
							value={activeSnippet}
						/>
					</div>
				</div>
			</section>
		</div>
	);
}
