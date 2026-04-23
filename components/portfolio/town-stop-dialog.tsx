"use client";

import type { PortfolioContent, TownStop } from "@/lib/portfolio-content";
import { PortfolioStopPanel } from "./portfolio-stop-panel";

export function TownStopDialog({
	content,
	isNightTheme,
	onClose,
	stop,
}: {
	content: PortfolioContent;
	isNightTheme: boolean;
	onClose: () => void;
	stop: TownStop | null;
}) {
	if (!stop) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 z-20 grid place-items-center bg-black/40 p-4 backdrop-blur-md sm:p-6"
			role="presentation"
			onClick={onClose}
		>
			<section
				className={`pokedex-box flex w-[min(1360px,calc(100vw-1rem))] max-h-[min(calc(100dvh-1rem),980px)] flex-col overflow-hidden p-5 sm:p-8 ${isNightTheme ? "night-ui" : ""}`}
				role="dialog"
				aria-modal="true"
				aria-labelledby="town-window-title"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="flex flex-col gap-4 border-b border-line/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-5">
						<div className="stop-dialog-index-badge flex h-14 w-12 shrink-0 items-center justify-center border-4 border-line bg-sky font-dot-gothic text-xl shadow-pixel sm:h-16 sm:w-14 sm:text-2xl">
							{stop.order}
						</div>
						<div>
							<p className="pixel-eyebrow">{stop.title}</p>
							<h2 className="m-0 font-dot-gothic text-2xl leading-tight sm:text-3xl" id="town-window-title">
								{stop.shortLabel}
							</h2>
						</div>
					</div>
					<button className="pixel-button w-full px-6 py-3 text-base sm:w-auto sm:text-lg" type="button" onClick={onClose}>
						Close Room
					</button>
				</div>

				<div className="flex-1 min-h-0 overflow-auto pr-2 pt-8 scrollbar-thin">
					<div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-[1fr_320px]">
						<div className="pixel-card stop-dialog-summary-card flex flex-col gap-1 border-line-soft/10 bg-white/60 p-5">
							<p className="stop-dialog-summary-title m-0 text-lg leading-tight sm:text-2xl">{stop.subtitle}</p>
							<span className="font-dot-gothic text-xs uppercase tracking-widest text-ink-soft">Current stop</span>
						</div>
						<div className="pixel-card stop-dialog-glance-card flex flex-col gap-2 bg-accent p-5 shadow-pixel">
							<p className="pixel-eyebrow text-xs!">At A Glance</p>
							<strong className="text-lg leading-tight sm:text-xl">{stop.preview}</strong>
						</div>
					</div>

					<PortfolioStopPanel content={content} stop={stop} />
				</div>
			</section>
		</div>
	);
}
