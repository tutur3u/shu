import {
	dialogFrameAssets,
	emoteAssets,
	mainCharacterAssets,
	mapAssets,
	npcAssets,
	referenceAssets,
	tileAssets,
	type PortfolioAsset,
} from "@/lib/asset-catalog";
import { portfolioContent, townMapVariants, townStops, type ShowcaseEntry } from "@/lib/portfolio-content";

export type ShuSyncField = {
	description?: string | null;
	key: string;
	label: string;
	options?: string[];
	required?: boolean;
	type: "boolean" | "date" | "datetime" | "json" | "markdown" | "number" | "string" | "string-array";
};

export type ShuExternalProjectManifest = {
	adapter: "shu";
	content: {
		entries: Array<{
			assets?: Array<{
				altText?: string | null;
				assetType: string;
				metadata?: Record<string, unknown>;
				sortOrder?: number;
				sourceUrl?: string | null;
				stableSourceId: string;
				storagePath?: string | null;
			}>;
			blocks?: Array<{
				blockType: string;
				content: Record<string, unknown>;
				sortOrder?: number;
				stableSourceId: string;
				title?: string | null;
			}>;
			collectionSlug: string;
			metadata?: Record<string, unknown>;
			profileData?: Record<string, unknown>;
			slug: string;
			stableSourceId: string;
			status?: "draft" | "scheduled" | "published" | "archived";
			subtitle?: string | null;
			summary?: string | null;
			title: string;
		}>;
	};
	schema: {
		collections: Array<{
			assetTypes?: string[];
			blockTypes?: string[];
			collection_type: string;
			description?: string | null;
			metadataFields?: ShuSyncField[];
			profileFields?: ShuSyncField[];
			slug: string;
			title: string;
		}>;
		metadataFields?: ShuSyncField[];
		profileFields?: ShuSyncField[];
	};
	version: 1;
};

const PUBLISHED_STATUS = "published" as const;

const projectProfileFields = [
	{ key: "category", label: "Category", type: "string" },
	{ key: "meta", label: "Meta", type: "string" },
	{ key: "role", label: "Role", type: "string" },
	{ key: "featured", label: "Featured", type: "boolean" },
] satisfies ShuSyncField[];

const assetProfileFields = [
	{ key: "tag", label: "Tag", type: "string" },
	{ key: "width", label: "Width", type: "number" },
	{ key: "height", label: "Height", type: "number" },
] satisfies ShuSyncField[];

function slugify(value: string) {
	return value
		.toLowerCase()
		.replace(/&/g, "and")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function showcaseEntry(entry: ShowcaseEntry, kind: "game" | "project") {
	const slug = slugify(entry.title);

	return {
		blocks: [
			{
				blockType: "markdown",
				content: {
					markdown: entry.blurb,
				},
				sortOrder: 0,
				stableSourceId: `shu:${kind}:${slug}:blurb`,
				title: "Blurb",
			},
			{
				blockType: "highlights",
				content: {
					items: entry.highlights,
				},
				sortOrder: 1,
				stableSourceId: `shu:${kind}:${slug}:highlights`,
				title: "Highlights",
			},
			{
				blockType: "links",
				content: {
					links: entry.links,
				},
				sortOrder: 2,
				stableSourceId: `shu:${kind}:${slug}:links`,
				title: "Links",
			},
		],
		collectionSlug: kind === "project" ? "projects" : "games",
		profileData: {
			category: entry.category,
			featured: Boolean(entry.featured),
			meta: entry.meta,
			role: entry.role,
		},
		slug,
		stableSourceId: `shu:${kind}:${slug}`,
		status: PUBLISHED_STATUS,
		summary: entry.blurb,
		title: entry.title,
	};
}

function assetEntry(asset: PortfolioAsset, group: string, index: number) {
	const slug = `${group}-${slugify(asset.title)}`;

	return {
		assets: [
			{
				altText: asset.title,
				assetType: "image",
				metadata: {
					height: asset.height,
					publicPath: asset.src,
					width: asset.width,
				},
				sortOrder: 0,
				sourceUrl: asset.src,
				stableSourceId: `shu:asset:${slug}:image`,
			},
		],
		blocks: [],
		collectionSlug: "asset-library",
		profileData: {
			height: asset.height,
			tag: asset.tag,
			width: asset.width,
		},
		slug,
		stableSourceId: `shu:asset:${slug}`,
		status: PUBLISHED_STATUS,
		summary: `${asset.tag} asset from the Shu portfolio library.`,
		title: asset.title,
		metadata: {
			group,
			index,
		},
	};
}

const assetEntries = [
	...mainCharacterAssets.map((asset, index) => assetEntry(asset, "main-character", index)),
	...npcAssets.map((asset, index) => assetEntry(asset, "npc", index)),
	...dialogFrameAssets.map((asset, index) => assetEntry(asset, "dialog-frame", index)),
	...emoteAssets.map((asset, index) => assetEntry(asset, "emote", index)),
	...mapAssets.map((asset, index) => assetEntry(asset, "map", index)),
	...referenceAssets.map((asset, index) => assetEntry(asset, "reference", index)),
	...tileAssets.map((asset, index) => assetEntry(asset, "tile", index)),
];

export const shuExternalProjectManifest = {
	adapter: "shu",
	content: {
		entries: [
			{
				assets: townMapVariants.map((variant, index) => ({
					altText: variant.label,
					assetType: "image",
					metadata: {
						height: variant.height,
						publicPath: variant.imageSrc,
						width: variant.width,
					},
					sortOrder: index,
					sourceUrl: variant.imageSrc,
					stableSourceId: `shu:map:${variant.id}:image`,
				})),
				blocks: [
					{
						blockType: "profile",
						content: {
							profile: portfolioContent.profile,
							quickStats: portfolioContent.profile.quickStats,
						},
						sortOrder: 0,
						stableSourceId: "shu:profile:overview",
						title: "Profile",
					},
					{
						blockType: "about-sections",
						content: portfolioContent.about,
						sortOrder: 1,
						stableSourceId: "shu:profile:about",
						title: "About",
					},
				],
				collectionSlug: "profile",
				profileData: {
					name: portfolioContent.profile.name,
					tagline: portfolioContent.profile.tagline,
					title: portfolioContent.profile.title,
				},
				slug: "profile",
				stableSourceId: "shu:profile",
				status: PUBLISHED_STATUS,
				summary: portfolioContent.profile.intro,
				title: portfolioContent.profile.name,
			},
			...portfolioContent.projects.map((entry) => showcaseEntry(entry, "project")),
			...portfolioContent.games.map((entry) => showcaseEntry(entry, "game")),
			...portfolioContent.contact.map((contact) => ({
				blocks: [],
				collectionSlug: "contact",
				profileData: {
					href: contact.href,
					note: contact.note,
					value: contact.value,
				},
				slug: slugify(contact.label),
				stableSourceId: `shu:contact:${slugify(contact.label)}`,
				status: PUBLISHED_STATUS,
				summary: contact.note,
				title: contact.label,
			})),
			...townStops.map((stop) => ({
				blocks: [],
				collectionSlug: "town-stops",
				metadata: {
					door: stop.door,
					exit: stop.exit,
					infoAnchor: stop.infoAnchor,
					outline: stop.outline,
				},
				profileData: {
					order: stop.order,
					recommendation: stop.recommendation,
					shortLabel: stop.shortLabel,
				},
				slug: stop.id,
				stableSourceId: `shu:town-stop:${stop.id}`,
				status: PUBLISHED_STATUS,
				subtitle: stop.subtitle,
				summary: stop.preview,
				title: stop.title,
			})),
			...assetEntries,
		],
	},
	schema: {
		collections: [
			{
				assetTypes: ["image"],
				blockTypes: ["profile", "about-sections"],
				collection_type: "profile",
				description: "Top-level Shu profile, about copy, and map backgrounds.",
				profileFields: [
					{ key: "name", label: "Name", type: "string" },
					{ key: "title", label: "Title", type: "string" },
					{ key: "tagline", label: "Tagline", type: "string" },
				],
				slug: "profile",
				title: "Profile",
			},
			{
				blockTypes: ["markdown", "highlights", "links"],
				collection_type: "projects",
				description: "Flagship project case studies and links.",
				profileFields: projectProfileFields,
				slug: "projects",
				title: "Projects",
			},
			{
				blockTypes: ["markdown", "highlights", "links"],
				collection_type: "games",
				description: "Playable experiments and game prototypes.",
				profileFields: projectProfileFields,
				slug: "games",
				title: "Games",
			},
			{
				collection_type: "contact",
				description: "Outbound contact routes.",
				profileFields: [
					{ key: "href", label: "URL", type: "string" },
					{ key: "value", label: "Display value", type: "string" },
					{ key: "note", label: "Note", type: "string" },
				],
				slug: "contact",
				title: "Contact",
			},
			{
				collection_type: "town-stops",
				description: "Walkable map stops and interaction anchors.",
				metadataFields: [
					{ key: "door", label: "Door", type: "json" },
					{ key: "exit", label: "Exit", type: "json" },
					{ key: "outline", label: "Outline", type: "json" },
				],
				profileFields: [
					{ key: "order", label: "Order", type: "string" },
					{ key: "shortLabel", label: "Short label", type: "string" },
					{ key: "recommendation", label: "Recommendation", type: "string" },
				],
				slug: "town-stops",
				title: "Town Stops",
			},
			{
				assetTypes: ["image"],
				collection_type: "asset-library",
				description: "Public folder assets used by the pixel portfolio.",
				profileFields: assetProfileFields,
				slug: "asset-library",
				title: "Asset Library",
			},
		],
		profileFields: [
			{ key: "brand", label: "Brand", type: "string" },
			{ key: "deliveryPreset", label: "Delivery preset", type: "string" },
		],
	},
	version: 1,
} satisfies ShuExternalProjectManifest;
