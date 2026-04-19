"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { ShowcaseEntry } from "@/lib/portfolio-content";

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

export function GameShelf({
	description,
	entries,
	title,
}: {
	description: string;
	entries: ShowcaseEntry[];
	title: string;
}) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
	const typeaheadRef = useRef("");
	const typeaheadTimerRef = useRef<number | null>(null);
	const autoFocusedRef = useRef(false);
	const selectedEntry = entries[selectedIndex];
	const primaryLink = selectedEntry.links[0] ?? null;
	const secondaryLinks = selectedEntry.links.slice(1);
	const listboxId = useId();
	const helperId = useId();

	useEffect(() => {
		optionRefs.current[selectedIndex]?.scrollIntoView({
			block: "nearest",
			inline: "nearest",
		});
	}, [selectedIndex]);

	useEffect(() => {
		return () => {
			if (typeaheadTimerRef.current) {
				window.clearTimeout(typeaheadTimerRef.current);
			}
		};
	}, []);

	function focusOption(index: number) {
		window.requestAnimationFrame(() => {
			optionRefs.current[index]?.focus();
		});
	}

	useEffect(() => {
		if (autoFocusedRef.current || entries.length === 0) {
			return;
		}

		autoFocusedRef.current = true;
		focusOption(selectedIndex);
	}, [entries.length, selectedIndex]);

	function moveSelection(nextIndex: number, shouldFocus = false) {
		const clampedIndex = clamp(nextIndex, 0, entries.length - 1);
		setSelectedIndex(clampedIndex);

		if (shouldFocus) {
			focusOption(clampedIndex);
		}
	}

	function openPrimaryLink(index: number) {
		const primaryLink = entries[index]?.links[0];

		if (!primaryLink) {
			return;
		}

		window.open(primaryLink.url, "_blank", "noopener,noreferrer");
	}

	function handleTypeahead(key: string) {
		if (!key.trim()) {
			return;
		}

		typeaheadRef.current = `${typeaheadRef.current}${key.toLowerCase()}`;

		if (typeaheadTimerRef.current) {
			window.clearTimeout(typeaheadTimerRef.current);
		}

		typeaheadTimerRef.current = window.setTimeout(() => {
			typeaheadRef.current = "";
		}, 450);

		const currentIndex = selectedIndex;
		const searchTerm = typeaheadRef.current;
		const wrappedEntries = [...entries.slice(currentIndex + 1), ...entries.slice(0, currentIndex + 1)];
		const match = wrappedEntries.find((entry) =>
			entry.title.toLowerCase().startsWith(searchTerm),
		);

		if (!match) {
			return;
		}

		const nextIndex = entries.findIndex((entry) => entry.title === match.title);
		moveSelection(nextIndex, true);
	}

	function handleOptionKeyDown(index: number, event: KeyboardEvent<HTMLButtonElement>) {
		switch (event.key) {
			case "ArrowUp":
			case "ArrowLeft":
				event.preventDefault();
				moveSelection(index - 1, true);
				break;
			case "ArrowDown":
			case "ArrowRight":
				event.preventDefault();
				moveSelection(index + 1, true);
				break;
			case "Home":
				event.preventDefault();
				moveSelection(0, true);
				break;
			case "End":
				event.preventDefault();
				moveSelection(entries.length - 1, true);
				break;
			case "PageUp":
				event.preventDefault();
				moveSelection(index - 3, true);
				break;
			case "PageDown":
				event.preventDefault();
				moveSelection(index + 3, true);
				break;
			case "Enter":
			case " ":
				event.preventDefault();
				openPrimaryLink(index);
				break;
			default:
				if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
					handleTypeahead(event.key);
				}
				break;
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<section className="pokedex-box flex flex-col gap-6 p-8">
				<div className="flex items-center justify-between gap-4">
					<p className="pixel-eyebrow">{title}</p>
					<span className="font-dot-gothic text-base uppercase tracking-wider text-ink-soft">
						{selectedIndex + 1}/{entries.length}
					</span>
				</div>
				<div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto]">
					<div className="flex flex-col gap-4">
						<h3 className="font-dot-gothic text-4xl leading-tight">{selectedEntry.title}</h3>
						<p className="font-dot-gothic text-xl uppercase tracking-wide text-ink-soft">
							{selectedEntry.role}
						</p>
						<p className="text-2xl leading-relaxed">{selectedEntry.blurb}</p>
					</div>

					<div className="flex flex-col gap-4 min-w-[280px]">
						{[
							{ label: "Category", value: selectedEntry.category },
							{ label: "Role", value: selectedEntry.role },
							{ label: "Format", value: selectedEntry.meta },
							{ label: "Primary Link", value: selectedEntry.links[0]?.label ?? "Unavailable" }
						].map((item) => (
							<div className="pixel-card flex flex-col gap-1 bg-panel-strong p-4" key={item.label}>
								<span className="font-dot-gothic text-sm uppercase tracking-wider text-ink-soft">
									{item.label}
								</span>
								<strong className="text-xl leading-tight">{item.value}</strong>
							</div>
						))}
					</div>
				</div>
				<p className="m-0 border-t border-line/10 pt-4 text-xl leading-relaxed text-ink-soft">
					{description}
				</p>
			</section>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(380px,0.95fr)_minmax(0,1.05fr)]">
				<section className="pokedex-box flex flex-col gap-5 p-6">
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="pixel-eyebrow">Arcade Picker</p>
							<h4 className="m-0 font-dot-gothic text-2xl">Choose A Build</h4>
						</div>
						<span className="pixel-button bg-accent px-3 py-1 font-dot-gothic text-sm lowercase shadow-none!">
							Keyboard Ready
						</span>
					</div>

					<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div className="flex flex-wrap gap-2" id={helperId}>
							{["↑↓ Move", "Home/End Jump", "Type Search", "Enter Launch"].map((hint) => (
								<span className="inline-flex items-center justify-center border-2 border-line/10 bg-white px-3 py-1 font-dot-gothic text-xs uppercase" key={hint}>
									{hint}
								</span>
							))}
						</div>
						<div className="flex gap-3">
							<button
								type="button"
								onClick={() => moveSelection(selectedIndex - 1, true)}
								disabled={selectedIndex === 0}
								aria-label="Select previous game"
								className="pixel-button px-4 py-2 text-sm disabled:opacity-50"
							>
								Prev
							</button>
							<button
								type="button"
								onClick={() => moveSelection(selectedIndex + 1, true)}
								disabled={selectedIndex === entries.length - 1}
								aria-label="Select next game"
								className="pixel-button px-4 py-2 text-sm disabled:opacity-50"
							>
								Next
							</button>
						</div>
					</div>

					<ul
						aria-describedby={helperId}
						aria-label="Game shelf picker"
						className="m-0 max-h-[800px] list-none overflow-auto p-0 pr-2 scrollbar-thin"
						id={listboxId}
						role="listbox"
					>
						{entries.map((entry, index) => {
							const isSelected = index === selectedIndex;

							return (
								<li key={entry.title} className="mb-3 last:mb-0">
									<button
										ref={(node) => {
											optionRefs.current[index] = node;
										}}
										aria-selected={isSelected}
										className={`flex w-full items-center gap-4 border-4 bg-panel px-4 py-4 text-left transition-all ${
											isSelected
												? "border-line bg-accent shadow-[4px_4px_0_rgba(0,0,0,0.1)]"
												: "border-line-soft/20 hover:border-line/20"
										}`}
										onClick={() => moveSelection(index)}
										onFocus={() => setSelectedIndex(index)}
										onKeyDown={(event) => handleOptionKeyDown(index, event)}
										role="option"
										tabIndex={isSelected ? 0 : -1}
										type="button"
									>
										<span className={`flex h-12 w-12 shrink-0 items-center justify-center border-4 border-line font-dot-gothic text-base ${isSelected ? 'bg-white' : 'bg-sky'}`}>
											{String(index + 1).padStart(2, "0")}
										</span>
										<span className="flex min-w-0 flex-col gap-1">
											<span className="flex items-center gap-3">
												<strong className="truncate text-xl leading-tight">{entry.title}</strong>
												{isSelected && (
													<span className="inline-flex items-center justify-center bg-black/10 px-2 py-0.5 font-dot-gothic text-xs uppercase">
														Selected
													</span>
												)}
											</span>
											<span className="font-dot-gothic text-xs uppercase tracking-wider text-ink-soft">
												{entry.category}
											</span>
										</span>
										<span className="ml-auto font-dot-gothic text-xs uppercase tracking-wider text-ink-soft sm:block hidden">
											{entry.meta}
										</span>
									</button>
								</li>
							);
						})}
					</ul>
				</section>

				<section className="pokedex-box relative flex flex-col gap-6 overflow-hidden p-6">
					<div className="flex items-start justify-between gap-4">
						<div className="flex min-w-0 flex-col gap-2">
							<p className="pixel-eyebrow">Now Highlighted</p>
							<div className="flex items-start justify-between gap-4">
								<h4 className="m-0 font-dot-gothic text-3xl leading-tight">{selectedEntry.title}</h4>
								<span className="pixel-button bg-accent px-3 py-1 font-dot-gothic text-sm lowercase shadow-none!">
									{selectedEntry.meta}
								</span>
							</div>
							<p className="m-0 font-dot-gothic text-lg text-ink-soft">{selectedEntry.role}</p>
						</div>
						<div className="flex h-20 w-20 shrink-0 items-center justify-center border-4 border-line bg-sky font-dot-gothic text-2xl shadow-pixel" aria-hidden="true">
							{String(selectedIndex + 1).padStart(2, "0")}
						</div>
					</div>

					<div className="pixel-card flex flex-col gap-3 bg-panel-strong p-5">
						<p className="pixel-eyebrow text-xs!">Build Readout</p>
						<p className="text-xl leading-relaxed">{selectedEntry.blurb}</p>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						{[
							{ label: "Category", value: selectedEntry.category },
							{ label: "Primary Link", value: primaryLink?.label ?? "Unavailable" }
						].map((item) => (
							<div className="pixel-card flex flex-col gap-1 bg-white/60 p-4" key={item.label}>
								<span className="font-dot-gothic text-[10px] uppercase tracking-widest text-ink-soft">
									{item.label}
								</span>
								<strong className="text-base leading-tight">{item.value}</strong>
							</div>
						))}
					</div>

					<section className="flex flex-col gap-4">
						<div className="flex items-center justify-between gap-4">
							<p className="pixel-eyebrow">Why Open This</p>
							<span className="font-dot-gothic text-[10px] uppercase tracking-widest text-ink-soft">
								{selectedEntry.highlights.length} notes
							</span>
						</div>

						<div className="grid gap-4">
							{selectedEntry.highlights.map((highlight, index) => (
								<article className="pixel-card grid grid-cols-[50px_1fr] items-start gap-4 bg-white/60 p-4" key={highlight}>
									<span className="font-dot-gothic text-xs text-ink-soft">
										{String(index + 1).padStart(2, "0")}
									</span>
									<p className="m-0 text-lg leading-relaxed">{highlight}</p>
								</article>
							))}
						</div>
					</section>

					<div className="mt-auto flex flex-col gap-4 pt-4">
						{primaryLink && (
							<a
								className="pixel-button flex min-h-[64px] items-center justify-center text-xl shadow-pixel-strong"
								href={primaryLink.url}
								target="_blank"
								rel="noreferrer"
							>
								Play {primaryLink.label}
							</a>
						)}

						{secondaryLinks.length > 0 && (
							<div className="flex flex-wrap gap-4">
								{secondaryLinks.map((link) => (
									<a
										className="pixel-button inline-flex flex-1 items-center justify-center bg-white px-6 py-3 text-lg"
										href={link.url}
										key={link.url}
										target="_blank"
										rel="noreferrer"
									>
										Open {link.label}
									</a>
								))}
							</div>
						)}

						<p className="m-0 text-center font-dot-gothic text-sm text-ink-soft">
							Press <kbd className="mx-1 border-2 border-line/10 bg-white px-2 py-0.5 align-middle">Enter</kbd> from the picker to launch.
						</p>
					</div>
				</section>
			</div>
		</div>
	);
}
