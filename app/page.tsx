import { Suspense } from "react";
import { TownPortfolio } from "@/components/portfolio/town-portfolio";
import { portfolioContent, townStops } from "@/lib/portfolio-content";

export default function Home() {
	return (
		<Suspense fallback={null}>
			<TownPortfolio content={portfolioContent} stops={townStops} />
		</Suspense>
	);
}
