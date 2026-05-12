import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShuAdminSyncPanel } from "@/components/admin/ShuAdminSyncPanel";
import { AdminDashboardShowcase } from "@/components/portfolio/admin-dashboard-showcase";
import { buildShuAdminLinks, resolveShuAdminTargetKey } from "@/lib/shu-config";
import { portfolioContent } from "@/lib/portfolio-content";
import { getShuSessionFromCookies } from "@/lib/shu-session";

export const metadata: Metadata = {
	title: "Shu Admin Center",
	description:
		"Centralized Tuturuuu admin dashboard for the Shu portfolio.",
};

export default async function AdminPage(props: {
	searchParams: Promise<{ target?: string }>;
}) {
	const session = await getShuSessionFromCookies();

	if (!session) {
		redirect("/admin/login?next=library");
	}

	const params = await props.searchParams;
	const activeTarget = resolveShuAdminTargetKey(params.target);
	const adminLinks = buildShuAdminLinks();

	return (
		<div className="relative min-h-screen overflow-hidden">
			<div className="town-page__chrome fixed inset-0 z-1 pointer-events-none" />
			<main className="relative z-10 mx-auto grid max-w-7xl gap-6 p-6">
				<header className="pokedex-box flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<p className="pixel-eyebrow text-xs!">Tuturuuu Admin</p>
						<h1 className="font-dot-gothic text-3xl leading-tight">Shu CMS Control Room</h1>
						<p className="mt-2 text-lg text-ink-soft">
							Signed in as {session.user.email ?? session.user.id}
						</p>
					</div>
					<div className="flex flex-wrap gap-3">
						<Link className="pixel-button px-4 py-2 text-sm" href="/">
							Back To Town
						</Link>
						<form action="/api/auth/logout" method="post">
							<button className="pixel-button px-4 py-2 text-sm" type="submit">
								Sign Out
							</button>
						</form>
					</div>
				</header>

				<section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
					{adminLinks.map((link) => (
						<a
							className={`pixel-card flex flex-col gap-3 p-4 transition ${
								link.key === activeTarget ? "bg-accent text-ink" : "bg-white/88"
							}`}
							href={link.cmsHref}
							key={link.key}
							rel="noreferrer"
							target="_blank"
						>
							<span className="pixel-eyebrow text-xs!">{link.label}</span>
							<strong className="text-lg leading-tight">{link.actionLabel}</strong>
							<span className="text-sm leading-snug text-ink-soft">{link.description}</span>
						</a>
					))}
				</section>

				<ShuAdminSyncPanel />

				<AdminDashboardShowcase
					contacts={portfolioContent.contact}
					dashboard={portfolioContent.dashboard}
					games={portfolioContent.games}
					initialUnlocked
					profile={portfolioContent.profile}
					projects={portfolioContent.projects}
				/>
			</main>
		</div>
	);
}
