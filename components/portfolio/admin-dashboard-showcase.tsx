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
		<div className="relative min-h-screen overflow-hidden">
			<div className="town-page__chrome fixed inset-0 z-1 pointer-events-none" />

			<main className="relative z-10 mx-auto grid max-w-7xl gap-6 p-6">
				<header className="pokedex-box flex items-center justify-between gap-4 p-6">
					<div>
						<p className="pixel-eyebrow text-xs!">Admin Center</p>
						<h1 className="font-dot-gothic text-3xl leading-tight">Portfolio Studio Desk</h1>
					</div>
					<Link className="pixel-button px-4 py-2 text-sm" href="/">
						Back To Town
					</Link>
				</header>

				{isUnlocked ? (
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
						<aside className="pixel-card flex flex-col gap-6 bg-panel-dark p-6 text-white">
							<p className="pixel-eyebrow text-white/60">Panels</p>
							<nav className="flex flex-col gap-4">
								{(["overview", "content", "queue"] as AdminView[]).map((view) => (
									<button
										type="button"
										key={view}
										onClick={() => setActiveView(view)}
										className={`pixel-button py-3 ${
											activeView === view
												? "bg-accent-strong text-white"
												: "bg-accent text-ink"
										}`}
									>
										{view}
									</button>
								))}
							</nav>

							<div className="mt-4 flex flex-col gap-4 border-t border-white/10 pt-6">
								<p className="pixel-eyebrow text-white/60">Preview Status</p>
								{dashboard.toolStatus.map((status) => (
									<div key={status.label} className="flex flex-col gap-1">
										<span className="font-dot-gothic text-xs uppercase tracking-widest text-white/40">
											{status.label}
										</span>
										<strong className="text-lg leading-tight">{status.value}</strong>
									</div>
								))}
							</div>
						</aside>

						<section className="flex flex-col gap-6">
							{activeView === "overview" ? (
								<>
									<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
										{stats.map((stat) => (
											<section className="pixel-card flex flex-col gap-2 p-6" key={stat.label}>
												<p className="pixel-eyebrow text-xs!">{stat.label}</p>
												<h2 className="text-3xl leading-tight">{stat.value}</h2>
											</section>
										))}
									</div>

									<section className="pixel-card flex flex-col gap-4 p-8">
										<p className="pixel-eyebrow">Studio Summary</p>
										<h2 className="text-2xl leading-relaxed">{dashboard.intro}</h2>
										<ul className="m-0 mt-4 flex flex-col gap-3 pl-8 list-disc">
											{dashboard.notes.map((note) => (
												<li key={note} className="text-xl leading-relaxed">
													{note}
												</li>
											))}
										</ul>
									</section>
								</>
							) : null}

							{activeView === "content" ? (
								<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
									<section className="pixel-card flex flex-col gap-6 p-8">
										<p className="pixel-eyebrow">Content Controls</p>
										<div className="flex flex-col gap-4">
											<label className="flex flex-col gap-2">
												<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">
													Hero Title
												</span>
												<input
													className="pixel-card bg-white p-3 font-dot-gothic text-lg outline-none focus:border-accent"
													type="text"
													value={heroTitle}
													onChange={(event) => setHeroTitle(event.target.value)}
												/>
											</label>
											<label className="flex flex-col gap-2">
												<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">
													Featured Project
												</span>
												<select
													className="pixel-card bg-white p-3 font-dot-gothic text-lg outline-none focus:border-accent"
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
											<label className="flex flex-col gap-2">
												<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">
													Featured Game
												</span>
												<select
													className="pixel-card bg-white p-3 font-dot-gothic text-lg outline-none focus:border-accent"
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
											<label className="flex flex-col gap-2">
												<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">
													CTA Tone
												</span>
												<select
													className="pixel-card bg-white p-3 font-dot-gothic text-lg outline-none focus:border-accent"
													value={ctaTone}
													onChange={(event) => setCtaTone(event.target.value)}
												>
													<option>Clear</option>
													<option>Warm</option>
													<option>Playful</option>
												</select>
											</label>
										</div>
									</section>

									<section className="pixel-card flex flex-col gap-6 p-8">
										<p className="pixel-eyebrow">Live Preview</p>
										<h2 className="text-2xl leading-tight">{heroTitle}</h2>
										<div className="grid grid-cols-2 gap-4">
											{[
												{ label: "Featured Project", value: featuredProject },
												{ label: "Featured Game", value: featuredGame },
												{ label: "CTA Tone", value: ctaTone },
												{ label: "Profile", value: profile.name }
											].map((item) => (
												<div className="pixel-card flex flex-col gap-1 bg-white/50 p-4" key={item.label}>
													<span className="font-dot-gothic text-xs uppercase tracking-widest text-ink-soft">
														{item.label}
													</span>
													<strong className="text-lg leading-tight">{item.value}</strong>
												</div>
											))}
										</div>
										<p className="m-0 border-t border-line/10 pt-4 text-lg leading-snug text-ink-soft">
											This view is meant for trying presentation changes before
											settling on a final direction.
										</p>
									</section>
								</div>
							) : null}

							{activeView === "queue" ? (
								<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
									<section className="pixel-card flex flex-col gap-4 p-8">
										<p className="pixel-eyebrow">Publish Queue</p>
										<ul className="m-0 flex flex-col gap-3 pl-8 list-disc">
											{dashboard.publishQueue.map((item) => (
												<li key={item} className="text-xl leading-relaxed">
													{item}
												</li>
											))}
										</ul>
									</section>

									<section className="pixel-card flex flex-col gap-6 p-8">
										<p className="pixel-eyebrow">Contact Routes</p>
										<div className="flex flex-col gap-4">
											{contacts.map((contact) => (
												<div
													className="pixel-card flex flex-col gap-2 border-line-soft/20 bg-white/60 p-5"
													key={contact.href}
												>
													<strong className="text-xl leading-tight">{contact.label}</strong>
													<span className="font-dot-gothic text-sm uppercase tracking-widest text-ink-soft">
														{contact.value}
													</span>
													<p className="m-0 text-lg leading-snug">{contact.note}</p>
												</div>
											))}
										</div>
									</section>
								</div>
							) : null}
						</section>
					</div>
				) : (
					<section className="pixel-card mx-auto mt-12 flex w-full max-w-lg flex-col gap-6 p-10">
						<p className="pixel-eyebrow text-xs!">Studio Preview</p>
						<h2 className="font-dot-gothic text-3xl leading-tight">Enter Portfolio Desk</h2>
						<p className="text-xl leading-relaxed">
							Open the curator-side preview for featured work, copy direction, and
							contact priorities.
						</p>
						<form
							className="mt-4 flex flex-col gap-6"
							onSubmit={(event) => {
								event.preventDefault();
								setIsUnlocked(true);
							}}
						>
							<label className="flex flex-col gap-2">
								<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">
									Profile Key
								</span>
								<input
									className="pixel-card bg-white p-3 font-dot-gothic text-lg outline-none focus:border-accent"
									type="text"
									defaultValue="lmquang"
								/>
							</label>
							<label className="flex flex-col gap-2">
								<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">
									Preview Pass
								</span>
								<input
									className="pixel-card bg-white p-3 font-dot-gothic text-lg outline-none focus:border-accent"
									type="password"
									defaultValue="0000"
								/>
							</label>
							<button className="pixel-button mt-4 py-4 text-xl" type="submit">
								Open Preview Desk
							</button>
						</form>
					</section>
				)}
			</main>
		</div>
	);
}
