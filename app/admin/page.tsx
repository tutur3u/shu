import type { Metadata } from "next";
import { AdminDashboardShowcase } from "@/components/portfolio/admin-dashboard-showcase";
import { portfolioContent } from "@/lib/portfolio-content";

export const metadata: Metadata = {
	title: "Admin Center",
	description:
		"A faux admin dashboard route for the Pokemon Town portfolio concept.",
};

export default function AdminPage() {
	return (
		<AdminDashboardShowcase
			contacts={portfolioContent.contact}
			dashboard={portfolioContent.dashboard}
			games={portfolioContent.games}
			profile={portfolioContent.profile}
			projects={portfolioContent.projects}
		/>
	);
}
