import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const displayFont = Press_Start_2P({
	weight: "400",
	variable: "--font-display",
	subsets: ["latin"],
});

const bodyFont = VT323({
	weight: "400",
	variable: "--font-body",
	subsets: ["latin"],
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
			className={`${displayFont.variable} ${bodyFont.variable} h-full antialiased`}
		>
			<body className="min-h-full">
				<Analytics />
				{children}
			</body>
		</html>
	);
}
