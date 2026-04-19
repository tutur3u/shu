import { TownPortfolio } from "@/components/portfolio/town-portfolio";
import { portfolioContent, townStops } from "@/lib/portfolio-content";

export default function Home() {
	return <TownPortfolio content={portfolioContent} stops={townStops} />;
}
