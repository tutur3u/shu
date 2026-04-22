"use client";

import Image from "next/image";
import type { StopId } from "@/lib/portfolio-content";
import {
	dialogFrameAssets,
	emoteAssets,
	mainCharacterAssets,
	mapAssets,
	npcAssets,
	portfolioAssetTotal,
	referenceAssets,
	tileAssets,
	type PortfolioAsset,
} from "@/lib/asset-catalog";

function AssetCountPill({
	label,
	value,
}: {
	label: string;
	value: string | number;
}) {
	return (
		<div className="pixel-card flex min-w-0 flex-col gap-1 bg-white/75 p-4">
			<span className="font-dot-gothic text-xs uppercase tracking-wider text-ink-soft">
				{label}
			</span>
			<strong className="text-lg leading-tight sm:text-xl">{value}</strong>
		</div>
	);
}

function AssetHero({
	badge,
	body,
	decor,
	roomCount,
	title,
}: {
	badge: string;
	body: string;
	decor: PortfolioAsset[];
	roomCount: number;
	title: string;
}) {
	return (
		<section className="pixel-card asset-room-hero relative overflow-hidden p-5 sm:p-8">
			<div className="relative z-10 flex flex-col gap-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<p className="pixel-eyebrow">{badge}</p>
					<span className="pixel-button bg-line px-3 py-1 font-dot-gothic text-xs lowercase text-white shadow-none!">
						{roomCount} assets in room
					</span>
				</div>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
					<div className="flex flex-col gap-4">
						<h3 className="font-dot-gothic text-3xl leading-tight sm:text-4xl">
							{title}
						</h3>
						<p className="m-0 max-w-3xl text-lg leading-relaxed sm:text-2xl">
							{body}
						</p>
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
							<AssetCountPill label="Room Pack" value={roomCount} />
							<AssetCountPill label="Whole Drop" value={portfolioAssetTotal} />
							<AssetCountPill label="Style" value="Pixel museum" />
							<AssetCountPill label="Mood" value="Show, don't stash" />
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						{decor.slice(0, 4).map((asset, index) => (
							<div
								className={`asset-preview asset-preview--dark pixel-card p-3 ${
									index === 0 ? "col-span-2" : ""
								}`}
								key={asset.src}
							>
								<div className="flex items-center justify-between gap-3 pb-3">
									<span className="asset-chip">{asset.tag}</span>
									<span className="font-dot-gothic text-[10px] uppercase tracking-wider text-white/70">
										{asset.width}x{asset.height}
									</span>
								</div>
								<div className="flex h-[160px] items-center justify-center sm:h-[180px]">
									<Image
										src={asset.src}
										alt={asset.title}
										width={asset.width}
										height={asset.height}
										className="h-full w-full object-contain"
										sizes="(max-width: 640px) 50vw, 240px"
									/>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="pointer-events-none absolute inset-0 opacity-30">
				<div className="absolute inset-y-0 right-0 w-40 bg-[radial-gradient(circle_at_top,#fff7c7_0,transparent_70%)]" />
				<div className="absolute left-0 top-0 h-28 w-28 bg-[radial-gradient(circle,#ffffff_0,transparent_72%)]" />
			</div>
		</section>
	);
}

function SectionHeader({
	body,
	eyebrow,
	title,
}: {
	body: string;
	eyebrow: string;
	title: string;
}) {
	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
			<div className="max-w-3xl">
				<p className="pixel-eyebrow">{eyebrow}</p>
				<h4 className="m-0 font-dot-gothic text-2xl leading-tight sm:text-3xl">
					{title}
				</h4>
			</div>
			<p className="m-0 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
				{body}
			</p>
		</div>
	);
}

function AssetCard({
	asset,
	frameClassName,
	imageHeightClassName,
	tone = "light",
}: {
	asset: PortfolioAsset;
	frameClassName?: string;
	imageHeightClassName: string;
	tone?: "dark" | "light";
}) {
	return (
		<article className={`pixel-card flex flex-col gap-4 bg-white/85 p-4 ${frameClassName ?? ""}`}>
			<div className="flex items-center justify-between gap-3">
				<div>
					<p className="pixel-eyebrow">{asset.tag}</p>
					<strong className="block text-lg leading-tight">{asset.title}</strong>
				</div>
				<span className="font-dot-gothic text-[10px] uppercase tracking-wider text-ink-soft">
					{asset.width}x{asset.height}
				</span>
			</div>
			<div className={`asset-preview ${tone === "dark" ? "asset-preview--dark" : "asset-preview--light"} ${imageHeightClassName}`}>
				<Image
					src={asset.src}
					alt={asset.title}
					width={asset.width}
					height={asset.height}
					className="h-full w-full object-contain"
					sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
				/>
			</div>
		</article>
	);
}

function SpriteGrid({
	body,
	eyebrow,
	items,
	title,
}: {
	body: string;
	eyebrow: string;
	items: readonly PortfolioAsset[];
	title: string;
}) {
	return (
		<section className="pixel-card flex flex-col gap-6 bg-panel-strong/60 p-5 sm:p-8">
			<SectionHeader eyebrow={eyebrow} title={title} body={body} />
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{items.map((asset) => (
					<AssetCard
						asset={asset}
						imageHeightClassName="h-[220px]"
						key={asset.src}
						tone="dark"
					/>
				))}
			</div>
		</section>
	);
}

function EffectGallery() {
	return (
		<section className="pixel-card flex flex-col gap-6 bg-panel-strong/60 p-5 sm:p-8">
			<SectionHeader
				eyebrow="Dialogue Chrome"
				title="Frames, emotes, and UI flourishes"
				body="The box art, prompt arrows, and reaction marks now live in one kit so the added effects feel like a consistent interface family."
			/>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				{dialogFrameAssets.map((asset) => (
					<AssetCard
						asset={asset}
						imageHeightClassName="h-[180px] sm:h-[220px]"
						key={asset.src}
						tone="light"
					/>
				))}
			</div>

			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
				{emoteAssets.map((asset) => (
					<AssetCard
						asset={asset}
						frameClassName="p-3"
						imageHeightClassName="h-[140px]"
						key={asset.src}
						tone="dark"
					/>
				))}
			</div>
		</section>
	);
}

function MapGallery() {
	return (
		<section className="pixel-card flex flex-col gap-6 bg-panel-strong/60 p-5 sm:p-8">
			<SectionHeader
				eyebrow="World Atlas"
				title="Overworlds and interiors"
				body="These maps now read like a location archive: empty shells, finished rooms, and route-scale mockups arranged as one atlas."
			/>
			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				{mapAssets.map((asset) => (
					<AssetCard
						asset={asset}
						imageHeightClassName="h-[220px] sm:h-[260px]"
						key={asset.src}
						tone="light"
					/>
				))}
			</div>
		</section>
	);
}

function TileGallery() {
	return (
		<section className="pixel-card flex flex-col gap-6 bg-panel-strong/60 p-5 sm:p-8">
			<SectionHeader
				eyebrow="Tile Bench"
				title="The movement and environment sheets"
				body="Door cycles, water loops, and the full tileset are grouped separately so the building blocks stay legible instead of getting buried under character art."
			/>
			<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
				{tileAssets.map((asset) => (
					<AssetCard
						asset={asset}
						imageHeightClassName="h-[240px] sm:h-[300px]"
						key={asset.src}
						tone="light"
					/>
				))}
			</div>
		</section>
	);
}

function ReferenceGallery() {
	return (
		<section className="pixel-card flex flex-col gap-6 bg-panel-strong/60 p-5 sm:p-8">
			<SectionHeader
				eyebrow="Reference Wall"
				title="Source boards and visual touchstones"
				body="Instead of hiding the inspiration set in the filesystem, the archive now presents every board and screenshot as a visible part of the portfolio’s world-building process."
			/>
			<div className="asset-reference-columns">
				{referenceAssets.map((asset) => (
					<article
						className="pixel-card mb-4 break-inside-avoid bg-white/88 p-4"
						key={asset.src}
					>
						<div className="mb-4 flex items-center justify-between gap-3">
							<div>
								<p className="pixel-eyebrow">{asset.tag}</p>
								<strong className="block text-lg leading-tight">{asset.title}</strong>
							</div>
							<span className="font-dot-gothic text-[10px] uppercase tracking-wider text-ink-soft">
								{asset.width}x{asset.height}
							</span>
						</div>
						<div className="asset-preview asset-preview--light h-[240px]">
							<Image
								src={asset.src}
								alt={asset.title}
								width={asset.width}
								height={asset.height}
								className="h-full w-full object-contain"
								sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
							/>
						</div>
					</article>
				))}
			</div>
		</section>
	);
}

export function AssetAnnexPanel({ stopId }: { stopId: StopId }) {
	if (stopId === "coming-soon") {
		return (
			<div className="flex flex-col gap-6">
				<AssetHero
					badge="Sprite Studio"
					title="Main trainer set, surfaced properly"
					body="This annex turns the new protagonist art into a dedicated room: full-body poses, top-down movement sheets, and the dialogue kit that gives them a proper interface context."
					decor={[
						dialogFrameAssets[7],
						mainCharacterAssets[6],
						mainCharacterAssets[5],
						emoteAssets[9],
					]}
					roomCount={
						mainCharacterAssets.length +
						dialogFrameAssets.length +
						emoteAssets.length
					}
				/>
				<SpriteGrid
					eyebrow="Hero Asset Pack"
					title="Main character poses and motion sheets"
					body="Every file from the new main-character folder is visible here, from static portraits and shadows to swim, surf, bike, and gesture variants."
					items={mainCharacterAssets}
				/>
				<EffectGallery />
			</div>
		);
	}

	if (stopId === "coming-soon-2") {
		return (
			<div className="flex flex-col gap-6">
				<AssetHero
					badge="Field Guide"
					title="NPC roster and interaction materials"
					body="The second annex now behaves like a route-side field guide: residents, creatures, and tile systems collected in one room so the world feels populated instead of implied."
					decor={[
						npcAssets[5],
						npcAssets[10],
						tileAssets[1],
						tileAssets[0],
					]}
					roomCount={npcAssets.length + tileAssets.length}
				/>
				<SpriteGrid
					eyebrow="Cast Roster"
					title="NPCs, special NPCs, and creatures"
					body="All of the added non-player sprites are now grouped as a roster rather than sitting unused beside the main character art."
					items={npcAssets}
				/>
				<TileGallery />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<AssetHero
				badge="Reference Archive"
				title="Maps and mood boards"
				body="The last annex becomes the town archive: playable-space mockups on one side, reference pulls and inspiration boards on the other."
				decor={[
					mapAssets[6],
					mapAssets[1],
					referenceAssets[7],
					referenceAssets[4],
				]}
				roomCount={mapAssets.length + referenceAssets.length}
			/>
			<MapGallery />
			<ReferenceGallery />
		</div>
	);
}
