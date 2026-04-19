import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { DotGothic16 } from "next/font/google";
import "./globals.css";

const dotGothic = DotGothic16({
	weight: "400",
	subsets: ["latin"],
	variable: "--font-dot-gothic",
});

export const metadata: Metadata = {
	title: {
		default: "Pokemon Town Portfolio",
		template: "%s | Pokemon Town Portfolio",
	},
	description:
		"A Pokemon-town portfolio with walking transitions, curated game design projects, and a faux admin showcase.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`${dotGothic.variable} h-full`}
		>
			<body className={`${dotGothic.className} min-h-full`}>
				<Analytics />
				{children}
			</body>
		</html>
	);
}
