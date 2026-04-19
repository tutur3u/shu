"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type {
	ContactEntry,
	DashboardContent,
	ProfileContent,
	ShowcaseEntry,
} from "@/lib/portfolio-content";

type AdminView = "overview" | "content" | "queue";

export function AdminDashboardShowcase({
	contacts,
	dashboard,
	games,
	profile,
	projects,
}: {
	contacts: ContactEntry[];
	dashboard: DashboardContent;
	games: ShowcaseEntry[];
	profile: ProfileContent;
	projects: ShowcaseEntry[];
}) {
	const [isUnlocked, setIsUnlocked] = useState(false);
	const [activeView, setActiveView] = useState<AdminView>("overview");
	const [heroTitle, setHeroTitle] = useState(
		"Game design work presented with a clear path, a playful wrapper, and a fast way into the strongest projects.",
	);
	const [featuredProject, setFeaturedProject] = useState(projects[0]?.title ?? "");
	const [featuredGame, setFeaturedGame] = useState(games[0]?.title ?? "");
	const [ctaTone, setCtaTone] = useState("Clear");

	const stats = useMemo(
		() => [
			{ label: "Projects", value: String(projects.length) },
			{ label: "Games", value: String(games.length) },
			{ label: "Contact routes", value: String(contacts.length) },
			{
				label: "Featured slots",
				value: projects.filter((project) => project.featured).length
					? "Curated"
					: "Unset",
			},
		],
		[contacts.length, games.length, projects],
	);

	return (
		<div className="admin-page">
			<div className="admin-page__chrome" />

			<main className="admin-wrap">
				<header className="admin-topbar">
					<div>
						<p className="pixel-eyebrow">Admin Center</p>
						<h1>Portfolio Studio Desk</h1>
					</div>
					<Link className="route-link route-link--small" href="/">
						Back To Town
					</Link>
				</header>

				{isUnlocked ? (
					<div className="admin-shell">
						<aside className="admin-sidebar">
							<p className="pixel-eyebrow">Panels</p>
							<div className="admin-sidebar__nav">
								{(["overview", "content", "queue"] as AdminView[]).map((view) => (
									<button
										type="button"
										key={view}
										onClick={() => setActiveView(view)}
										className={activeView === view ? "is-active" : undefined}
									>
										{view}
									</button>
								))}
							</div>

							<div className="admin-sidebar__notes">
								<p className="pixel-eyebrow">Preview Status</p>
								{dashboard.toolStatus.map((status) => (
									<div key={status.label}>
										<span>{status.label}</span>
										<strong>{status.value}</strong>
									</div>
								))}
							</div>
						</aside>

						<section className="admin-main">
							{activeView === "overview" ? (
								<>
									<div className="admin-card-grid">
										{stats.map((stat) => (
											<section className="admin-card" key={stat.label}>
												<p className="pixel-eyebrow">{stat.label}</p>
												<h2>{stat.value}</h2>
											</section>
										))}
									</div>

									<section className="admin-card admin-card--wide">
										<p className="pixel-eyebrow">Studio Summary</p>
										<h2>{dashboard.intro}</h2>
										<ul className="window-list">
											{dashboard.notes.map((note) => (
												<li key={note}>{note}</li>
											))}
										</ul>
									</section>
								</>
							) : null}

							{activeView === "content" ? (
								<div className="admin-editor">
									<section className="admin-card">
										<p className="pixel-eyebrow">Content Controls</p>
										<label className="admin-field">
											<span>Hero Title</span>
											<input
												type="text"
												value={heroTitle}
												onChange={(event) => setHeroTitle(event.target.value)}
											/>
										</label>
										<label className="admin-field">
											<span>Featured Project</span>
											<select
												value={featuredProject}
												onChange={(event) => setFeaturedProject(event.target.value)}
											>
												{projects.map((project) => (
													<option key={project.title} value={project.title}>
														{project.title}
													</option>
												))}
											</select>
										</label>
										<label className="admin-field">
											<span>Featured Game</span>
											<select
												value={featuredGame}
												onChange={(event) => setFeaturedGame(event.target.value)}
											>
												{games.map((game) => (
													<option key={game.title} value={game.title}>
														{game.title}
													</option>
												))}
											</select>
										</label>
										<label className="admin-field">
											<span>CTA Tone</span>
											<select
												value={ctaTone}
												onChange={(event) => setCtaTone(event.target.value)}
											>
												<option>Clear</option>
												<option>Warm</option>
												<option>Playful</option>
											</select>
										</label>
									</section>

									<section className="admin-card">
										<p className="pixel-eyebrow">Live Preview</p>
										<h2>{heroTitle}</h2>
										<div className="status-grid">
											<div>
												<span>Featured Project</span>
												<strong>{featuredProject}</strong>
											</div>
											<div>
												<span>Featured Game</span>
												<strong>{featuredGame}</strong>
											</div>
											<div>
												<span>CTA Tone</span>
												<strong>{ctaTone}</strong>
											</div>
											<div>
												<span>Profile</span>
												<strong>{profile.name}</strong>
											</div>
										</div>
										<p className="admin-muted">
											This view is meant for trying presentation changes before
											settling on a final direction.
										</p>
									</section>
								</div>
							) : null}

							{activeView === "queue" ? (
								<div className="admin-editor">
									<section className="admin-card">
										<p className="pixel-eyebrow">Publish Queue</p>
										<ul className="window-list">
											{dashboard.publishQueue.map((item) => (
												<li key={item}>{item}</li>
											))}
										</ul>
									</section>

									<section className="admin-card">
										<p className="pixel-eyebrow">Contact Routes</p>
										<div className="contact-list">
											{contacts.map((contact) => (
												<div className="contact-card" key={contact.href}>
													<strong>{contact.label}</strong>
													<span>{contact.value}</span>
													<p>{contact.note}</p>
												</div>
											))}
										</div>
									</section>
								</div>
							) : null}
						</section>
					</div>
				) : (
					<section className="admin-login">
						<p className="pixel-eyebrow">Studio Preview</p>
						<h2>Enter Portfolio Desk</h2>
						<p>
							Open the curator-side preview for featured work, copy direction, and
							contact priorities.
						</p>
						<form
							onSubmit={(event) => {
								event.preventDefault();
								setIsUnlocked(true);
							}}
						>
							<label className="admin-field">
								<span>Profile Key</span>
								<input type="text" defaultValue="lmquang" />
							</label>
							<label className="admin-field">
								<span>Preview Pass</span>
								<input type="password" defaultValue="0000" />
							</label>
							<button type="submit">Open Preview Desk</button>
						</form>
					</section>
				)}
			</main>
		</div>
	);
}
