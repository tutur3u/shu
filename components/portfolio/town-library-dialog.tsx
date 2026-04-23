"use client";

import type { LibrarySelection } from "./sprite-library-data";
import { SpriteLibraryPanel } from "./sprite-library-panel";

export function TownLibraryDialog({
	isNightTheme,
	onClose,
	onSelectionChange,
	open,
	selection,
}: {
	isNightTheme: boolean;
	onClose: () => void;
	onSelectionChange: (selection: LibrarySelection | null) => void;
	open: boolean;
	selection: LibrarySelection | null;
}) {
	if (!open) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 z-20 grid place-items-center bg-black/45 p-4 backdrop-blur-sm sm:p-6"
			role="presentation"
			onClick={onClose}
		>
			<section
				className={`pokedex-box flex w-[min(1400px,calc(100vw-1rem))] max-w-full max-h-[min(calc(100dvh-1rem),980px)] flex-col gap-5 overflow-x-hidden overflow-y-auto p-5 scrollbar-thin sm:gap-6 sm:p-8 ${isNightTheme ? "night-ui" : ""}`}
				role="dialog"
				aria-modal="true"
				aria-labelledby="library-dialog-title"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="flex flex-col gap-3 border-b border-line/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="pixel-eyebrow">Sprite Library</p>
						<h2
							className="m-0 font-dot-gothic text-xl leading-tight sm:text-2xl"
							id="library-dialog-title"
						>
							Character sheets and shared palette
						</h2>
					</div>
					<button
						className="pixel-button w-full px-4 py-2 text-sm sm:w-auto"
						type="button"
						onClick={onClose}
					>
						Close Library
					</button>
				</div>

				<SpriteLibraryPanel
					isNightTheme={isNightTheme}
					selection={selection}
					onSelectionChange={onSelectionChange}
				/>
			</section>
		</div>
	);
}
