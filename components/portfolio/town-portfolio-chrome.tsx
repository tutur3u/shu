"use client";

import { useState } from "react";
import Link from "next/link";
import type {
	StopId,
	TownMapBackgroundId,
	TownMapVariant,
	TownStop,
} from "@/lib/portfolio-content";

export function TownPortfolioChrome({
	activeBackgroundId,
	activeStopId,
	availableBackgrounds,
	dayPhaseButtonLabel,
	editorEnabled,
	focusStopId,
	libraryOpen,
	isNightTheme,
	onBackgroundChange,
	onCycleDayPhase,
	onEnterStop,
	onOpenGuide,
	onOpenLibrary,
	onOpenMapEditor,
	shortcutStops,
	travelingTo,
}: {
	activeBackgroundId: TownMapBackgroundId;
	activeStopId: StopId | null;
	availableBackgrounds: TownMapVariant[];
	dayPhaseButtonLabel: string;
	editorEnabled: boolean;
	focusStopId: StopId | null;
	isNightTheme: boolean;
	libraryOpen: boolean;
	onBackgroundChange: (backgroundId: TownMapBackgroundId) => void;
	onCycleDayPhase: () => void;
	onEnterStop: (stopId: StopId) => void;
	onOpenGuide: () => void;
	onOpenLibrary: () => void;
	onOpenMapEditor: () => void;
	shortcutStops: TownStop[];
	travelingTo: StopId | null;
}) {
	const [routeMenuOpen, setRouteMenuOpen] = useState(false);
	const buttonClass = isNightTheme ? "pixel-button pixel-button--night" : "pixel-button";
	const activeButtonClass = isNightTheme
		? "pixel-button pixel-button--night pixel-button--night-active"
		: "pixel-button pixel-button--active";
	const skyButtonClass = isNightTheme
		? "pixel-button pixel-button--night-alt"
		: "pixel-button pixel-button--sky";
	const backgroundCardClass = isNightTheme
		? "pixel-card pixel-card--night pointer-events-auto flex min-w-[9rem] items-center gap-2 px-3 py-2"
		: "pixel-card pointer-events-auto flex min-w-[9rem] items-center gap-2 bg-white/85 px-3 py-2";

	return (
		<div className="pointer-events-none absolute left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-20 flex flex-col gap-3 sm:left-6 sm:right-6 sm:top-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="pointer-events-auto flex max-w-[min(100%,46rem)] flex-wrap items-stretch gap-2">
					<button
						type="button"
						className={`${buttonClass} min-h-[42px] px-3 py-2 text-[11px] sm:px-4 sm:text-xs`}
						onClick={onOpenGuide}
					>
						Guide
					</button>
					<button
						type="button"
						className={`${libraryOpen ? activeButtonClass : buttonClass} min-h-[42px] px-3 py-2 text-[11px] sm:px-4 sm:text-xs`}
						onClick={onOpenLibrary}
					>
						Library
					</button>
					<button
						type="button"
						className={`${buttonClass} min-h-[42px] px-3 py-2 text-[11px] sm:px-4 sm:text-xs`}
						onClick={onCycleDayPhase}
					>
						{dayPhaseButtonLabel}
					</button>
					{editorEnabled ? (
						<button
							type="button"
							className={`${skyButtonClass} min-h-[42px] px-3 py-2 text-[11px] sm:px-4 sm:text-xs`}
							onClick={onOpenMapEditor}
						>
							Map Editor
						</button>
					) : null}
					{availableBackgrounds.length > 1 ? (
						<label className={backgroundCardClass}>
							<select
								className={`min-w-0 flex-1 bg-transparent font-dot-gothic text-[11px] outline-none sm:text-xs ${isNightTheme ? "text-paper" : ""}`}
								value={activeBackgroundId}
								onChange={(event) =>
									onBackgroundChange(event.target.value as TownMapBackgroundId)
								}
							>
								{availableBackgrounds.map((background) => (
									<option key={background.id} value={background.id}>
										{background.label}
									</option>
								))}
							</select>
						</label>
					) : null}
					<div className="relative">
						<button
							type="button"
							className={`${routeMenuOpen ? activeButtonClass : buttonClass} min-h-[42px] px-3 py-2 text-[11px] sm:px-4 sm:text-xs`}
							onClick={() => setRouteMenuOpen((current) => !current)}
							aria-expanded={routeMenuOpen}
							aria-controls="town-route-accordion"
						>
							Routes {routeMenuOpen ? "−" : "+"}
						</button>
						{routeMenuOpen ? (
							<div
								className={`${isNightTheme ? "pixel-card pixel-card--night" : "pixel-card bg-white/92"} absolute left-0 top-[calc(100%+0.45rem)] z-30 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-2 p-2 shadow-pixel-strong`}
								id="town-route-accordion"
							>
								{shortcutStops.map((stop) => {
									const isActiveShortcut =
										stop.id === activeStopId ||
										stop.id === travelingTo ||
										stop.id === focusStopId;

									return (
										<button
											key={stop.id}
											type="button"
											className={`${isActiveShortcut ? activeButtonClass : buttonClass} min-h-[40px] justify-start px-3 py-2 text-[11px] sm:text-xs`}
											onClick={() => {
												setRouteMenuOpen(false);
												onEnterStop(stop.id);
											}}
										>
											{stop.shortLabel}
										</button>
									);
								})}
							</div>
						) : null}
					</div>
				</div>
				<Link
					className={`${buttonClass} pointer-events-auto min-h-[42px] w-full px-4 py-2 text-center text-[11px] sm:min-h-0 sm:w-auto sm:px-5 sm:text-xs`}
					href="/admin"
				>
					Dashboard
				</Link>
			</div>
		</div>
	);
}
