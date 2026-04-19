"use client";

import Link from "next/link";
import type { PortfolioContent, StopId, TownStop } from "@/lib/portfolio-content";
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
	const detailMode = getStopDetailMode(stop);

	if (detailMode === "about") {
		return (
			<div className="flex flex-col gap-6">
				<section className="pokedex-box flex flex-col gap-6 p-8">
					<div className="flex items-center justify-between gap-4">
						<p className="pixel-eyebrow">Profile Snapshot</p>
						<span className="pixel-button bg-line px-3 py-1 font-dot-gothic text-xs lowercase text-white shadow-none!">
							{content.profile.title}
						</span>
					</div>
					<div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto]">
						<div className="flex flex-col gap-4">
							<h3 className="font-dot-gothic text-4xl leading-tight">{content.profile.name}</h3>
							<p className="text-2xl leading-relaxed">{content.profile.tagline}</p>
							<p className="m-0 text-xl leading-relaxed text-ink-soft">
								{content.about.lead}
								<span className="pixel-arrow">▼</span>
							</p>
						</div>
						<div className="flex flex-col gap-4 min-w-[280px]">
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
						<section className="pixel-card flex flex-col gap-4 bg-panel-strong/50 p-6" key={section.title}>
							<div className="flex items-center justify-between gap-4">
								<p className="pixel-eyebrow">{section.title}</p>
								<span className="pixel-button bg-accent px-3 py-1 font-dot-gothic text-xs lowercase shadow-none!">
									Focus
								</span>
							</div>
							<p className="m-0 text-xl leading-relaxed">{section.body}</p>
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
				<section className="pokedex-box flex flex-col gap-6 p-8">
					<div className="flex items-center justify-between gap-4">
						<p className="pixel-eyebrow">Flagship Work</p>
						<span className="pixel-button bg-line px-3 py-1 font-dot-gothic text-xs lowercase text-white shadow-none!">
							Curated Board
						</span>
					</div>
					<div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto]">
						<div className="flex flex-col gap-4">
							<h3 className="font-dot-gothic text-4xl leading-tight">Projects</h3>
							<p className="text-2xl leading-relaxed">
								Team projects, showcase pieces, and design writing selected for the
								clearest read on process, tone, and presentation.
								<span className="pixel-arrow">▼</span>
							</p>
						</div>
						<div className="flex flex-col gap-4 min-w-[280px]">
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
				<section className="pokedex-box flex flex-col gap-6 p-8">
					<div className="flex items-center justify-between gap-4">
						<p className="pixel-eyebrow">Next Move</p>
						<span className="pixel-button bg-line px-3 py-1 font-dot-gothic text-xs lowercase text-white shadow-none!">
							Open Channels
						</span>
					</div>
					<div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto]">
						<div className="flex flex-col gap-4">
							<h3 className="font-dot-gothic text-4xl leading-tight">Contact</h3>
							<p className="text-2xl leading-relaxed">
								Reach out through the route that fits best, from professional
								follow-up to browsing more released work.
								<span className="pixel-arrow">▼</span>
							</p>
						</div>
						<div className="flex flex-col gap-4 min-w-[280px]">
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
							className="pixel-card flex flex-col gap-2 bg-panel-strong p-6 transition-all hover:border-accent hover:bg-white"
							href={entry.href}
							key={entry.href}
							target="_blank"
							rel="noreferrer"
						>
							<p className="pixel-eyebrow">{entry.label}</p>
							<strong className="text-2xl leading-tight">{entry.value}</strong>
							<p className="m-0 text-lg leading-snug text-ink-soft">{entry.note}</p>
						</a>
					))}
				</div>
			</div>
		);
	}

	if (detailMode === "coming-soon") {
		return (
			<div className="flex flex-col gap-6">
				<section className="pokedex-box flex flex-col gap-6 p-8">
					<div className="flex items-center justify-between gap-4">
						<p className="pixel-eyebrow">Reserved Build Site</p>
						<span className="pixel-button bg-line px-3 py-1 font-dot-gothic text-xs lowercase text-white shadow-none!">
							Slot {stop.order}
						</span>
					</div>
					<div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto]">
						<div className="flex flex-col gap-4">
							<h3 className="font-dot-gothic text-4xl leading-tight">{stop.title}</h3>
							<p className="text-2xl leading-relaxed">
								This route is still empty on purpose. It is being held for the next
								portfolio drop so new work arrives with its own front door instead
								of getting buried inside an older room.
								<span className="pixel-arrow">▼</span>
							</p>
						</div>
						<div className="flex flex-col gap-4 min-w-[280px]">
							<div className="pixel-card flex flex-col gap-1 bg-panel-strong p-4">
								<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">Status</span>
								<strong className="text-xl leading-tight">Reserved</strong>
							</div>
							<div className="pixel-card flex flex-col gap-1 bg-panel-strong p-4">
								<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">Priority</span>
								<strong className="text-xl leading-tight">Next notable addition</strong>
							</div>
						</div>
					</div>
				</section>

				<div className="grid grid-cols-1 gap-6">
					<section className="pixel-card flex flex-col gap-6 bg-panel-strong/50 p-8">
						<div className="flex items-center justify-between gap-4">
							<p className="pixel-eyebrow">Possible Directions</p>
							<span className="pixel-button bg-accent px-3 py-1 font-dot-gothic text-xs lowercase shadow-none!">
								Three Lanes
							</span>
						</div>

						<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
							{[
								{ id: "01", title: "Fresh Case Study", body: "A full project room with stronger process notes, links, and final presentation." },
								{ id: "02", title: "Playable Prototype", body: "A smaller release that deserves its own shelf, playable link, and supporting context." },
								{ id: "03", title: "Design Writing", body: "A critical piece that expands the portfolio through analysis, theory, and reflection." }
							].map((lane) => (
								<article className="pixel-card flex flex-col gap-2 bg-white/60 p-5" key={lane.id}>
									<p className="pixel-eyebrow text-xs!">{lane.id}</p>
									<strong className="text-xl leading-tight">{lane.title}</strong>
									<p className="m-0 text-lg leading-snug text-ink-soft">{lane.body}</p>
								</article>
							))}
						</div>
					</section>

					<section className="pixel-card flex flex-col gap-6 bg-panel-strong/50 p-8">
						<div className="flex items-center justify-between gap-4">
							<p className="pixel-eyebrow">Current Signal</p>
							<span className="pixel-button bg-accent px-3 py-1 font-dot-gothic text-xs lowercase shadow-none!">
								At A Glance
							</span>
						</div>
						<p className="m-0 text-xl leading-relaxed">{stop.preview}</p>
						<div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
							{[
								{ title: "Worth the detour", body: "The next room should add a new angle to the portfolio, not repeat an existing stop." },
								{ title: "Readable fast", body: "Even playful work should still make its point in one quick pass." },
								{ title: "Linked out cleanly", body: "Every future stop should end with a clear action: play, watch, read, or reach out." }
							].map((principle) => (
								<div className="pixel-card flex flex-col gap-2 bg-white/40 p-5" key={principle.title}>
									<strong className="text-lg leading-tight">{principle.title}</strong>
									<p className="m-0 text-base leading-snug text-ink-soft">{principle.body}</p>
								</div>
							))}
						</div>
					</section>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<section className="pokedex-box flex flex-col gap-6 p-8">
				<div className="flex items-center justify-between gap-4">
					<p className="pixel-eyebrow">Studio Preview</p>
					<span className="pixel-button bg-line px-3 py-1 font-dot-gothic text-xs lowercase text-white shadow-none!">
						Curator View
					</span>
				</div>
				<div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto]">
					<div className="flex flex-col gap-4">
						<h3 className="font-dot-gothic text-4xl leading-tight">Control Room</h3>
						<p className="text-2xl leading-relaxed">{content.dashboard.intro}</p>
					</div>
					<div className="flex flex-col gap-4 min-w-[280px]">
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
