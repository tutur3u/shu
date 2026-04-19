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
			<div className="window-room window-room--about">
				<section className="window-hero window-hero--profile">
					<div className="window-kicker-row">
						<p className="pixel-eyebrow">Profile Snapshot</p>
						<span className="window-status">{content.profile.title}</span>
					</div>
					<div className="window-hero__split">
						<div className="window-hero__body">
							<h3>{content.profile.name}</h3>
							<p className="window-hero__lede">{content.profile.tagline}</p>
							<p className="window-copy">{content.about.lead}</p>
						</div>
						<div className="window-stat-stack">
							{content.profile.quickStats.map((stat) => (
								<div className="window-chip" key={stat.label}>
									<span>{stat.label}</span>
									<strong>{stat.value}</strong>
								</div>
							))}
						</div>
					</div>
				</section>

				<div className="window-grid window-grid--about">
					{content.about.sections.map((section) => (
						<section className="window-panel window-panel--story" key={section.title}>
							<div className="window-panel__headerline">
								<p className="pixel-eyebrow">{section.title}</p>
								<span className="window-panel__badge">Focus</span>
							</div>
							<p>{section.body}</p>
							<ul className="window-list">
								{section.points.map((point) => (
									<li key={point}>{point}</li>
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
			<div className="window-room">
				<section className="window-hero window-hero--compact">
					<div className="window-kicker-row">
						<p className="pixel-eyebrow">Flagship Work</p>
						<span className="window-status">Curated Board</span>
					</div>
					<div className="window-hero__split">
						<div className="window-hero__body">
							<h3>Projects</h3>
							<p className="window-hero__lede">
								Team projects, showcase pieces, and design writing selected for the
								clearest read on process, tone, and presentation.
							</p>
						</div>
						<div className="window-chip-row">
							<div className="window-chip">
								<span>Entries</span>
								<strong>{content.projects.length}</strong>
							</div>
							<div className="window-chip">
								<span>Featured</span>
								<strong>
									{content.projects.filter((project) => project.featured).length}
								</strong>
							</div>
							<div className="window-chip">
								<span>Formats</span>
								<strong>Builds, videos, writing</strong>
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
			<div className="window-room window-room--games">
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
			<div className="window-room">
				<section className="window-hero">
					<div className="window-kicker-row">
						<p className="pixel-eyebrow">Next Move</p>
						<span className="window-status">Open Channels</span>
					</div>
					<div className="window-hero__split">
						<div className="window-hero__body">
							<h3>Contact</h3>
							<p className="window-hero__lede">
								Reach out through the route that fits best, from professional
								follow-up to browsing more released work.
							</p>
						</div>
						<div className="window-chip-row">
							<div className="window-chip">
								<span>Channels</span>
								<strong>{content.contact.length}</strong>
							</div>
							<div className="window-chip">
								<span>Best First Step</span>
								<strong>LinkedIn or portfolio</strong>
							</div>
							<div className="window-chip">
								<span>Playables</span>
								<strong>Itch collection linked</strong>
							</div>
						</div>
					</div>
				</section>

				<div className="contact-grid">
					{content.contact.map((entry) => (
						<a
							className="contact-card"
							href={entry.href}
							key={entry.href}
							target="_blank"
							rel="noreferrer"
						>
							<p className="pixel-eyebrow">{entry.label}</p>
							<strong>{entry.value}</strong>
							<p>{entry.note}</p>
						</a>
					))}
				</div>
			</div>
		);
	}

	if (detailMode === "coming-soon") {
		return (
			<div className="window-room">
				<section className="window-hero">
					<div className="window-kicker-row">
						<p className="pixel-eyebrow">Reserved Build Site</p>
						<span className="window-status">Slot {stop.order}</span>
					</div>
					<div className="window-hero__split">
						<div className="window-hero__body">
							<h3>{stop.title}</h3>
							<p className="window-hero__lede">
								This route is still empty on purpose. It is being held for the next
								portfolio drop so new work arrives with its own front door instead
								of getting buried inside an older room.
							</p>
						</div>
						<div className="window-chip-row">
							<div className="window-chip">
								<span>Status</span>
								<strong>Reserved</strong>
							</div>
							<div className="window-chip">
								<span>Priority</span>
								<strong>Next notable addition</strong>
							</div>
							<div className="window-chip">
								<span>Best Fit</span>
								<strong>Something that needs its own room</strong>
							</div>
						</div>
					</div>
				</section>

				<div className="window-grid">
					<section className="window-panel">
						<div className="window-panel__headerline">
							<p className="pixel-eyebrow">Possible Directions</p>
							<span className="window-panel__badge">Three Lanes</span>
						</div>

						<div className="future-lane-grid">
							<article className="future-lane-card">
								<p className="pixel-eyebrow">01</p>
								<strong>Fresh Case Study</strong>
								<p>A full project room with stronger process notes, links, and final presentation.</p>
							</article>
							<article className="future-lane-card">
								<p className="pixel-eyebrow">02</p>
								<strong>Playable Prototype</strong>
								<p>A smaller release that deserves its own shelf, playable link, and supporting context.</p>
							</article>
							<article className="future-lane-card">
								<p className="pixel-eyebrow">03</p>
								<strong>Design Writing</strong>
								<p>A critical piece that expands the portfolio through analysis, theory, and reflection.</p>
							</article>
						</div>
					</section>

					<section className="window-panel">
						<div className="window-panel__headerline">
							<p className="pixel-eyebrow">Current Signal</p>
							<span className="window-panel__badge">At A Glance</span>
						</div>
						<p>{stop.preview}</p>
						<div className="future-principles">
							<div className="future-principles__card">
								<strong>Worth the detour</strong>
								<p>The next room should add a new angle to the portfolio, not repeat an existing stop.</p>
							</div>
							<div className="future-principles__card">
								<strong>Readable fast</strong>
								<p>Even playful work should still make its point in one quick pass.</p>
							</div>
							<div className="future-principles__card">
								<strong>Linked out cleanly</strong>
								<p>Every future stop should end with a clear action: play, watch, read, or reach out.</p>
							</div>
						</div>
					</section>
				</div>
			</div>
		);
	}

	return (
		<div className="window-room">
			<section className="window-hero">
				<div className="window-kicker-row">
					<p className="pixel-eyebrow">Studio Preview</p>
					<span className="window-status">Curator View</span>
				</div>
				<div className="window-hero__split">
					<div className="window-hero__body">
						<h3>Control Room</h3>
						<p className="window-hero__lede">{content.dashboard.intro}</p>
					</div>
					<div className="window-chip-row">
						{content.dashboard.toolStatus.map((status) => (
							<div className="window-chip" key={status.label}>
								<span>{status.label}</span>
								<strong>{status.value}</strong>
							</div>
						))}
					</div>
				</div>
			</section>

			<div className="window-grid">
				<section className="window-panel">
					<p className="pixel-eyebrow">Desk Notes</p>
					<ul className="window-list">
						{content.dashboard.notes.map((note) => (
							<li key={note}>{note}</li>
						))}
					</ul>
				</section>

				<section className="window-panel">
					<p className="pixel-eyebrow">Priority Queue</p>
					<ul className="window-list">
						{content.dashboard.publishQueue.map((item) => (
							<li key={item}>{item}</li>
						))}
					</ul>
					<Link className="route-link" href="/admin">
						Open Admin Center
					</Link>
				</section>
			</div>
		</div>
	);
}
