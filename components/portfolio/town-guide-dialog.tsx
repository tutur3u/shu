"use client";

import type { PortfolioContent, TownStop } from "@/lib/portfolio-content";
import { isUnsetPosition } from "./town-portfolio-helpers";
import { getStop } from "./town-map-utils";

export function TownGuideDialog({
	activeStopId,
	content,
	effectiveStops,
	instantTravel,
	onClose,
	onEnterStop,
	onToggleLegacyBackground,
	onToggleSkipTravel,
	open,
	sceneLabel,
	showLegacyBackground,
	isNightTheme,
	stops,
}: {
	activeStopId: TownStop["id"] | null;
	content: PortfolioContent;
	effectiveStops: TownStop[];
	instantTravel: boolean;
	onClose: () => void;
	onEnterStop: (stopId: TownStop["id"]) => void;
	onToggleLegacyBackground: () => void;
	onToggleSkipTravel: () => void;
	open: boolean;
	sceneLabel: string;
	showLegacyBackground: boolean;
	isNightTheme: boolean;
	stops: TownStop[];
}) {
	if (!open) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 z-20 grid place-items-center bg-black/40 p-4 backdrop-blur-sm sm:p-6"
			role="presentation"
			onClick={onClose}
		>
			<section
				className={`pokedex-box flex w-[min(720px,calc(100vw-1rem))] max-w-full max-h-[min(calc(100dvh-1rem),900px)] flex-col gap-5 overflow-x-hidden overflow-y-auto p-5 scrollbar-thin sm:gap-6 sm:p-8 ${isNightTheme ? "night-ui" : ""}`}
				role="dialog"
				aria-modal="true"
				aria-labelledby="guide-dialog-title"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="pixel-eyebrow">Pokemon Town Portfolio</p>
						<h2 className="m-0 font-dot-gothic text-xl leading-tight sm:text-2xl" id="guide-dialog-title">
							Choose your route through the work.
						</h2>
					</div>
					<button className="pixel-button w-full px-4 py-2 text-sm sm:w-auto" type="button" onClick={onClose}>
						Close
					</button>
				</div>

				<p className="m-0 text-lg leading-tight sm:text-2xl">
					{content.profile.intro}
					<span className="pixel-arrow">▼</span>
				</p>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="pixel-card flex min-w-0 flex-col gap-1 bg-white/80 p-4">
						<span className="font-dot-gothic text-xs uppercase tracking-wider text-ink-soft">Current scene</span>
						<strong className="truncate text-lg leading-tight sm:text-xl">{sceneLabel}</strong>
					</div>
					<div className="pixel-card flex min-w-0 flex-col gap-1 bg-white/80 p-4">
						<span className="font-dot-gothic text-xs uppercase tracking-wider text-ink-soft">Mode</span>
						<strong className="truncate text-lg leading-tight sm:text-xl">{instantTravel ? "Recruiter mode" : "Walk mode"}</strong>
					</div>
					{content.profile.quickStats.map((stat) => (
						<div className="pixel-card flex min-w-0 flex-col gap-1 bg-white/80 p-4" key={stat.label}>
							<span className="font-dot-gothic text-xs uppercase tracking-wider text-ink-soft">{stat.label}</span>
							<strong className="truncate text-lg leading-tight sm:text-xl">{stat.value}</strong>
						</div>
					))}
				</div>

				<div className="flex flex-col gap-4 border-t border-line/10 pt-6">
					<div className="flex items-center justify-between gap-4">
						<p className="pixel-eyebrow">Settings</p>
					</div>
					<div className="pixel-card guide-setting-card flex min-w-0 box-border flex-col gap-4 bg-white/40 p-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex min-w-0 flex-1 flex-col gap-1">
							<strong className="truncate text-base leading-tight sm:text-lg">Instant Travel</strong>
							<span className="font-dot-gothic text-xs text-ink-soft">Skip walking transitions between stops</span>
						</div>
						<button
							type="button"
							className={`pixel-button w-full px-4 py-2 text-sm transition-colors sm:w-auto ${instantTravel ? "bg-accent" : "bg-white"}`}
							onClick={onToggleSkipTravel}
						>
							{instantTravel ? "Enabled" : "Disabled"}
						</button>
					</div>
					<div className="pixel-card guide-setting-card flex min-w-0 box-border flex-col gap-4 bg-white/40 p-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex min-w-0 flex-1 flex-col gap-1">
							<strong className="truncate text-base leading-tight sm:text-lg">Legacy Background 1</strong>
							<span className="font-dot-gothic text-xs text-ink-soft">Show the original background as an optional alternate map</span>
						</div>
						<button
							type="button"
							className={`pixel-button w-full px-4 py-2 text-sm transition-colors sm:w-auto ${showLegacyBackground ? "bg-accent" : "bg-white"}`}
							onClick={onToggleLegacyBackground}
						>
							{showLegacyBackground ? "Enabled" : "Hidden"}
						</button>
					</div>
				</div>

				<div className="grid gap-4 pt-4">
					{stops.map((stop) => {
						const isCurrent = activeStopId === stop.id;
						const isRecommended = stop.id === "about" || stop.id === "projects";
						const effectiveStop = getStop(effectiveStops, stop.id);
						const hasMappedStop =
							effectiveStop.outline.length >= 3 &&
							!isUnsetPosition(effectiveStop.door);

						return (
							<button
								key={stop.id}
								type="button"
								className={`guide-stop-option group flex min-w-0 box-border flex-col items-start gap-4 border-4 p-4 text-left transition-all sm:flex-row sm:items-center sm:gap-5 ${
									!hasMappedStop
										? "cursor-not-allowed border-line-soft/10 bg-white/40 opacity-50"
										: isCurrent
											? "border-line bg-accent shadow-[4px_4px_0_rgba(0,0,0,0.1)]"
											: isRecommended
												? "border-accent-strong/40 bg-accent/10 hover:bg-accent/20"
												: "border-line-soft/10 bg-white/60 hover:bg-white"
								}`}
								disabled={!hasMappedStop}
								onClick={() => {
									onEnterStop(stop.id);
									onClose();
								}}
							>
								<span className={`guide-stop-option__badge flex h-12 w-12 shrink-0 items-center justify-center border-4 border-line font-dot-gothic text-lg sm:h-14 sm:w-14 sm:text-xl ${isCurrent ? "bg-white" : "bg-sky"}`}>
									{stop.order}
								</span>
								<div className="flex min-w-0 flex-1 flex-col gap-1">
									<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
										<strong className="truncate text-lg leading-tight sm:text-xl">{stop.title}</strong>
										{isRecommended ? (
											<span className="guide-stop-option__recommended shrink-0 bg-accent-strong px-2 py-0.5 font-dot-gothic text-[10px] uppercase text-white">
												Recommended
											</span>
										) : null}
									</div>
									<p className="m-0 text-base leading-tight text-ink-soft sm:truncate sm:text-lg">{stop.preview}</p>
								</div>
								<span className="ml-auto hidden font-dot-gothic text-xl text-accent-strong opacity-0 transition-opacity group-hover:opacity-100 sm:block sm:animate-pixel-blink">
									▶
								</span>
							</button>
						);
					})}
				</div>
			</section>
		</div>
	);
}
