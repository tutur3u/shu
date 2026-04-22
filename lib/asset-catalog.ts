export type PortfolioAsset = {
	title: string;
	src: string;
	width: number;
	height: number;
	tag: string;
};

const createAsset = (
	title: string,
	src: string,
	width: number,
	height: number,
	tag: string,
): PortfolioAsset => ({
	title,
	src,
	width,
	height,
	tag,
});

export const mainCharacterAssets = [
	createAsset("Bike Idle", "/assets/characters/main/bike-idle.png", 160, 640, "Pose"),
	createAsset("Bike Move", "/assets/characters/main/bike-move.png", 640, 640, "Sheet"),
	createAsset(
		"Full Body Sit Shadow",
		"/assets/characters/main/full-body-sit-shadow.png",
		560,
		560,
		"Shadow",
	),
	createAsset("Full Body Sit", "/assets/characters/main/full-body-sit.png", 560, 560, "Portrait"),
	createAsset(
		"Full Body Stand Shadow",
		"/assets/characters/main/full-body-stand-shadow.png",
		560,
		560,
		"Shadow",
	),
	createAsset(
		"Full Body Stand",
		"/assets/characters/main/full-body-stand.png",
		560,
		560,
		"Portrait",
	),
	createAsset("Full Sheet", "/assets/characters/main/full-sheet.png", 2720, 1920, "Master Sheet"),
	createAsset("Lay Down", "/assets/characters/main/lay-down.png", 320, 640, "Pose"),
	createAsset("Move", "/assets/characters/main/move.png", 640, 640, "Sheet"),
	createAsset("Sit Shadow", "/assets/characters/main/sit-shadow.png", 560, 560, "Shadow"),
	createAsset("Sit", "/assets/characters/main/sit.png", 160, 640, "Pose"),
	createAsset("Stand Shadow", "/assets/characters/main/stand-shadow.png", 560, 560, "Shadow"),
	createAsset("Surf", "/assets/characters/main/surf.png", 320, 640, "Sheet"),
	createAsset("Swim", "/assets/characters/main/swim.png", 320, 640, "Sheet"),
	createAsset("Wave", "/assets/characters/main/wave.png", 320, 160, "Gesture"),
] as const satisfies readonly PortfolioAsset[];

export const npcAssets = [
	createAsset("Creature 1", "/assets/characters/npcs/creature-1.png", 320, 640, "Creature"),
	createAsset("Creature 2", "/assets/characters/npcs/creature-2.png", 320, 640, "Creature"),
	createAsset("Creature 3", "/assets/characters/npcs/creature-3.png", 320, 640, "Creature"),
	createAsset("Creature 4", "/assets/characters/npcs/creature-4.png", 320, 640, "Creature"),
	createAsset("Creature 5", "/assets/characters/npcs/creature-5.png", 320, 640, "Creature"),
	createAsset("NPC 1", "/assets/characters/npcs/npc-1.png", 640, 640, "NPC"),
	createAsset("NPC 2", "/assets/characters/npcs/npc-2.png", 640, 640, "NPC"),
	createAsset("NPC 3", "/assets/characters/npcs/npc-3.png", 640, 640, "NPC"),
	createAsset("NPC 4", "/assets/characters/npcs/npc-4.png", 640, 640, "NPC"),
	createAsset("NPC 5", "/assets/characters/npcs/npc-5.png", 640, 640, "NPC"),
	createAsset("Special NPC 1", "/assets/characters/npcs/snpc-1.png", 640, 640, "Special"),
	createAsset("Special NPC 2", "/assets/characters/npcs/snpc-2.png", 480, 640, "Special"),
] as const satisfies readonly PortfolioAsset[];

export const dialogFrameAssets = [
	createAsset("Dialog Arrow Down", "/assets/effects/dialog-arrow-down.png", 120, 80, "Pointer"),
	createAsset(
		"Dialog Disected Box",
		"/assets/effects/dialog-disected-box.png",
		800,
		800,
		"Frame",
	),
	createAsset(
		"Dialog Medium Box",
		"/assets/effects/dialog-medium-box.png",
		2720,
		640,
		"Frame",
	),
	createAsset(
		"Dialog Small Box",
		"/assets/effects/dialog-small-box.png",
		1920,
		640,
		"Frame",
	),
	createAsset(
		"Dialog Tall Box",
		"/assets/effects/dialog-tall-box.png",
		1920,
		1120,
		"Frame",
	),
	createAsset("Line", "/assets/effects/line.png", 980, 160, "Divider"),
	createAsset("Sparkle", "/assets/effects/sparkle.png", 160, 960, "FX"),
	createAsset("Trainer Card", "/assets/effects/trainer-card.png", 2720, 1920, "UI"),
] as const satisfies readonly PortfolioAsset[];

export const emoteAssets = [
	createAsset("Emote Angry", "/assets/effects/emote-angry.png", 160, 800, "Emote"),
	createAsset("Emote Annoy", "/assets/effects/emote-annoy.png", 160, 800, "Emote"),
	createAsset("Emote Arrow Down", "/assets/effects/emote-arrow-down.png", 160, 800, "Emote"),
	createAsset("Emote Arrow Left", "/assets/effects/emote-arrow-left.png", 160, 800, "Emote"),
	createAsset("Emote Arrow Right", "/assets/effects/emote-arrow-right.png", 160, 800, "Emote"),
	createAsset("Emote Arrow Up", "/assets/effects/emote-arrow-up.png", 160, 800, "Emote"),
	createAsset("Emote Dot", "/assets/effects/emote-dot.png", 160, 800, "Emote"),
	createAsset("Emote Empty", "/assets/effects/emote-empty.png", 160, 800, "Emote"),
	createAsset("Emote Exclaim", "/assets/effects/emote-exclaim.png", 160, 800, "Emote"),
	createAsset("Emote Heart", "/assets/effects/emote-heart.png", 160, 800, "Emote"),
	createAsset("Emote No", "/assets/effects/emote-no.png", 160, 800, "Emote"),
	createAsset("Emote Question", "/assets/effects/emote-question.png", 160, 800, "Emote"),
	createAsset("Emote Sweat", "/assets/effects/emote-sweat.png", 160, 800, "Emote"),
	createAsset("Emote Yes", "/assets/effects/emote-yes.png", 160, 800, "Emote"),
] as const satisfies readonly PortfolioAsset[];

export const mapAssets = [
	createAsset("Construction Site", "/assets/maps/construction-site.png", 960, 800, "Map"),
	createAsset("Fountain", "/assets/maps/fountain.png", 960, 1280, "Map"),
	createAsset("Overworld House 1", "/assets/maps/overworld-house-1.png", 960, 960, "Map"),
	createAsset("Overworld House 2", "/assets/maps/overworld-house-2.png", 960, 960, "Map"),
	createAsset(
		"Red House Empty Interior",
		"/assets/maps/red-house-empty-interior.png",
		1600,
		1440,
		"Interior",
	),
	createAsset(
		"Red House Interior",
		"/assets/maps/red-house-interior.png",
		1600,
		1440,
		"Interior",
	),
	createAsset(
		"Town Without Structures",
		"/assets/maps/town-without-structures.png",
		3840,
		3680,
		"Overworld",
	),
	createAsset(
		"Yellow House Empty Interior",
		"/assets/maps/yellow-house-empty-interior.png",
		1600,
		1440,
		"Interior",
	),
	createAsset(
		"Yellow House Interior",
		"/assets/maps/yellow-house-interior.png",
		1600,
		1440,
		"Interior",
	),
] as const satisfies readonly PortfolioAsset[];

export const referenceAssets = [
	createAsset("AteBit World", "/assets/references/AteBit World.png", 256, 3550, "Reference"),
	createAsset("Bag Interface", "/assets/references/Bag Interface.png", 411, 804, "Reference"),
	createAsset("Biking", "/assets/references/Biking.png", 443, 362, "Reference"),
	createAsset(
		"Hall of Fame Example",
		"/assets/references/Hall of Fame Example.jpg",
		445,
		400,
		"Reference",
	),
	createAsset("Map Example", "/assets/references/Map Example.png", 320, 576, "Reference"),
	createAsset(
		"Overworld NPC Classes",
		"/assets/references/Overworld NPC Classes.jpg",
		260,
		285,
		"Reference",
	),
	createAsset(
		"Overworld NPC Spritesheet",
		"/assets/references/Overworld NPC spritesheet.png",
		294,
		273,
		"Reference",
	),
	createAsset(
		"Pallet Town Overview",
		"/assets/references/Pallet Town Overview.png",
		400,
		386,
		"Reference",
	),
	createAsset(
		"Pokemon Party Icons",
		"/assets/references/Pokemon Party Icons.png",
		623,
		625,
		"Reference",
	),
	createAsset(
		"Trainer Battle Example",
		"/assets/references/Trainer Battle Example.jpg",
		480,
		360,
		"Reference",
	),
	createAsset("Trainer Card", "/assets/references/Trainer Card.png", 532, 336, "Reference"),
	createAsset("Speech HGSS 34", "/assets/references/speech hgss 34.png", 96, 48, "Reference"),
] as const satisfies readonly PortfolioAsset[];

export const tileAssets = [
	createAsset("Door Animation", "/assets/tiles/door-animation.png", 160, 1120, "Tile"),
	createAsset("Tileset", "/assets/tiles/tileset.png", 5120, 5120, "Tile"),
	createAsset("Water Animation", "/assets/tiles/water-animation.png", 960, 3840, "Tile"),
] as const satisfies readonly PortfolioAsset[];

export const portfolioAssetTotal =
	mainCharacterAssets.length +
	npcAssets.length +
	dialogFrameAssets.length +
	emoteAssets.length +
	mapAssets.length +
	referenceAssets.length +
	tileAssets.length;
