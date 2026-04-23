"use client";

import Link from "next/link";
import type { PortfolioContent, StopId, TownStop } from "@/lib/portfolio-content";
import { AssetAnnexPanel } from "./asset-annexes";
import { GameShelf } from "./game-shelf";
import { PixelSelect } from "./pixel-select";

function getStopDetailMode(stop: TownStop): StopId {
	return stop.detailMode ?? stop.id;
}

export function PortfolioStopPanel({
	content,
	stop,
}: {
	content: PortfolioContent;
	stop: TownStop;
}) {
	if (
		stop.id === "coming-soon" ||
		stop.id === "coming-soon-2" ||
		stop.id === "coming-soon-3"
	) {
		return <AssetAnnexPanel stopId={stop.id} />;
	}

	const detailMode = getStopDetailMode(stop);

	if (detailMode === "about") {
		return (
			<div className="flex flex-col gap-6">
				<section className="pokedex-box flex flex-col gap-6 p-5 sm:p-8">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<p className="pixel-eyebrow">Profile Snapshot</p>
						<span className="pixel-button stop-panel-status-chip bg-line px-3 py-1 font-dot-gothic text-xs lowercase text-white shadow-none!">
							{content.profile.title}
						</span>
					</div>
					<div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto]">
						<div className="flex flex-col gap-4">
							<h3 className="font-dot-gothic text-3xl leading-tight sm:text-4xl">{content.profile.name}</h3>
							<p className="text-lg leading-relaxed sm:text-2xl">{content.profile.tagline}</p>
							<p className="m-0 text-lg leading-relaxed text-ink-soft sm:text-xl">
								{content.about.lead}
								<span className="pixel-arrow">▼</span>
							</p>
						</div>
						<div className="flex w-full flex-col gap-4 lg:min-w-[280px]">
							{content.profile.quickStats.map((stat) => (
								<div className="pixel-card flex flex-col gap-1 bg-panel-strong p-4" key={stat.label}>
									<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">{stat.label}</span>
									<strong className="text-xl leading-tight">{stat.value}</strong>
								</div>
							))}
						</div>
					</div>
				</section>

				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					{content.about.sections.map((section) => (
						<section className="pixel-card stop-panel-focus-card flex flex-col gap-4 bg-panel-strong/50 p-6" key={section.title}>
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<p className="pixel-eyebrow">{section.title}</p>
								<span className="pixel-button stop-panel-accent-chip bg-accent px-3 py-1 font-dot-gothic text-xs lowercase shadow-none!">
									Focus
								</span>
							</div>
							<p className="m-0 text-lg leading-relaxed sm:text-xl">{section.body}</p>
							<ul className="m-0 mt-2 flex flex-col gap-2 pl-5 list-disc">
								{section.points.map((point) => (
									<li key={point} className="text-lg leading-snug">{point}</li>
								))}
							</ul>
						</section>
					))}
				</div>
			</div>
		);
	}

	if (detailMode === "projects") {
		return (
			<div className="flex flex-col gap-6">
				<section className="pokedex-box flex flex-col gap-6 p-5 sm:p-8">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<p className="pixel-eyebrow">Flagship Work</p>
						<span className="pixel-button stop-panel-status-chip bg-line px-3 py-1 font-dot-gothic text-xs lowercase text-white shadow-none!">
							Curated Board
						</span>
					</div>
					<div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto]">
						<div className="flex flex-col gap-4">
							<h3 className="font-dot-gothic text-3xl leading-tight sm:text-4xl">Projects</h3>
							<p className="text-lg leading-relaxed sm:text-2xl">
								Team projects, showcase pieces, and design writing selected for the
								clearest read on process, tone, and presentation.
								<span className="pixel-arrow">▼</span>
							</p>
						</div>
						<div className="flex w-full flex-col gap-4 lg:min-w-[280px]">
							<div className="pixel-card flex flex-col gap-1 bg-panel-strong p-4">
								<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">Entries</span>
								<strong className="text-xl leading-tight">{content.projects.length}</strong>
							</div>
							<div className="pixel-card flex flex-col gap-1 bg-panel-strong p-4">
								<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">Featured</span>
								<strong className="text-xl leading-tight">
									{content.projects.filter((project) => project.featured).length}
								</strong>
							</div>
							<div className="pixel-card flex flex-col gap-1 bg-panel-strong p-4">
								<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">Formats</span>
								<strong className="text-xl leading-tight">Builds, videos, writing</strong>
							</div>
						</div>
					</div>
				</section>
				<PixelSelect
					title="Project Board"
					description="Browse the strongest case studies first, then move through the supporting pieces."
					entries={content.projects}
				/>
			</div>
		);
	}

	if (detailMode === "games") {
		return (
			<div className="flex flex-col gap-6">
				<GameShelf
					title="Playable Shelf"
					description="A keyboard-first arcade picker for the smaller builds, experiments, and quick play links."
					entries={content.games}
				/>
			</div>
		);
	}

	if (detailMode === "contact") {
		return (
			<div className="flex flex-col gap-6">
				<section className="pokedex-box flex flex-col gap-6 p-5 sm:p-8">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<p className="pixel-eyebrow">Next Move</p>
						<span className="pixel-button stop-panel-status-chip bg-line px-3 py-1 font-dot-gothic text-xs lowercase text-white shadow-none!">
							Open Channels
						</span>
					</div>
					<div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto]">
						<div className="flex flex-col gap-4">
							<h3 className="font-dot-gothic text-3xl leading-tight sm:text-4xl">Contact</h3>
							<p className="text-lg leading-relaxed sm:text-2xl">
								Reach out through the route that fits best, from professional
								follow-up to browsing more released work.
								<span className="pixel-arrow">▼</span>
							</p>
						</div>
						<div className="flex w-full flex-col gap-4 lg:min-w-[280px]">
							<div className="pixel-card flex flex-col gap-1 bg-panel-strong p-4">
								<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">Channels</span>
								<strong className="text-xl leading-tight">{content.contact.length}</strong>
							</div>
							<div className="pixel-card flex flex-col gap-1 bg-panel-strong p-4">
								<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">Best First Step</span>
								<strong className="text-xl leading-tight">LinkedIn or portfolio</strong>
							</div>
						</div>
					</div>
				</section>

				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
					{content.contact.map((entry) => (
						<a
							className="pixel-card stop-panel-link-card flex flex-col gap-2 bg-panel-strong p-6 transition-all hover:border-accent hover:bg-white"
							href={entry.href}
							key={entry.href}
							target="_blank"
							rel="noreferrer"
						>
							<p className="pixel-eyebrow">{entry.label}</p>
							<strong className="text-xl leading-tight sm:text-2xl">{entry.value}</strong>
							<p className="m-0 text-lg leading-snug text-ink-soft">{entry.note}</p>
						</a>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<section className="pokedex-box flex flex-col gap-6 p-5 sm:p-8">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<p className="pixel-eyebrow">Studio Preview</p>
						<span className="pixel-button stop-panel-status-chip bg-line px-3 py-1 font-dot-gothic text-xs lowercase text-white shadow-none!">
							Curator View
						</span>
				</div>
				<div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto]">
					<div className="flex flex-col gap-4">
						<h3 className="font-dot-gothic text-3xl leading-tight sm:text-4xl">Control Room</h3>
						<p className="text-lg leading-relaxed sm:text-2xl">{content.dashboard.intro}</p>
					</div>
					<div className="flex w-full flex-col gap-4 lg:min-w-[280px]">
						{content.dashboard.toolStatus.map((status) => (
							<div className="pixel-card flex flex-col gap-1 bg-panel-strong p-4" key={status.label}>
								<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">{status.label}</span>
								<strong className="text-xl leading-tight">{status.value}</strong>
							</div>
						))}
					</div>
				</div>
			</section>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<section className="pixel-card flex flex-col gap-4 bg-panel-strong p-6">
					<p className="pixel-eyebrow">Desk Notes</p>
					<ul className="m-0 flex flex-col gap-2 pl-5 list-disc">
						{content.dashboard.notes.map((note) => (
							<li key={note} className="text-lg leading-snug">{note}</li>
						))}
					</ul>
				</section>

				<section className="pixel-card flex flex-col gap-4 bg-panel-strong p-6">
					<p className="pixel-eyebrow">Priority Queue</p>
					<ul className="m-0 flex flex-col gap-2 pl-5 list-disc">
						{content.dashboard.publishQueue.map((item) => (
							<li key={item} className="text-lg leading-snug">{item}</li>
						))}
					</ul>
					<Link className="pixel-button mt-4" href="/admin">
						Open Admin Center
					</Link>
				</section>
			</div>
		</div>
	);
}
