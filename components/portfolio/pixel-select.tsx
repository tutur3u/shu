"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { ShowcaseEntry } from "@/lib/portfolio-content";

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

export function PixelSelect({
	title,
	description,
	entries,
}: {
	title: string;
	description: string;
	entries: ShowcaseEntry[];
}) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
	const typeaheadRef = useRef("");
	const typeaheadTimerRef = useRef<number | null>(null);
	const autoFocusedRef = useRef(false);
	const listboxId = useId();
	const helperId = useId();

	const selectedEntry = entries[selectedIndex];

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
		<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(420px,1fr)_minmax(0,1.2fr)]">
			<div className="pixel-card flex flex-col gap-6 p-5 sm:p-8">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<p className="pixel-eyebrow">{title}</p>
					<span className="font-dot-gothic text-base tracking-wider text-ink-soft">
						{selectedIndex + 1}/{entries.length}
					</span>
				</div>
				<h3 className="font-dot-gothic text-3xl leading-tight sm:text-4xl">{selectedEntry.title}</h3>
				<p className="m-0 text-lg leading-relaxed sm:text-2xl">{selectedEntry.blurb}</p>
				<p className="mt-4 border-l-6 border-accent bg-black/5 p-4 text-base leading-relaxed text-ink-soft sm:text-xl">
					{description} Launch with <kbd className="mx-2 inline-block border-2 border-line-soft bg-white px-2 align-middle font-dot-gothic text-base">Enter</kbd>.
				</p>
				<div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
					{[
						{ label: "Category", value: selectedEntry.category },
						{ label: "Role", value: selectedEntry.role },
						{ label: "Format", value: selectedEntry.meta },
						{ label: "Status", value: selectedEntry.featured ? "Featured" : "Available" }
					].map((item) => (
						<div className="pixel-card flex flex-col gap-1 bg-panel-strong p-4" key={item.label}>
							<span className="font-dot-gothic text-sm tracking-wider text-ink-soft uppercase">{item.label}</span>
							<strong className="text-xl leading-tight">{item.value}</strong>
						</div>
					))}
				</div>
			</div>

			<div className="grid grid-cols-1 gap-6 outline-none focus-visible:ring-4 focus-visible:ring-accent">
				<div className="pixel-card flex flex-col gap-6 p-5 sm:p-8">
					<div className="flex flex-col gap-2 font-dot-gothic text-sm uppercase sm:flex-row sm:items-center sm:justify-between sm:text-base">
						<span>Project List</span>
						<span id={helperId}>Arrows to move</span>
					</div>

					<div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-[60px_1fr] sm:gap-6">
						<div className="flex gap-4 sm:flex-col">
							<button
								type="button"
								onClick={() => moveSelection(selectedIndex - 1, true)}
								disabled={selectedIndex === 0}
								aria-label={`Scroll ${title} up`}
								className="pixel-button h-12 w-full sm:h-14"
							>
								▲
							</button>
							<button
								type="button"
								onClick={() => moveSelection(selectedIndex + 1, true)}
								disabled={selectedIndex === entries.length - 1}
								aria-label={`Scroll ${title} down`}
								className="pixel-button h-12 w-full sm:h-14"
							>
								▼
							</button>
						</div>

						<ul
							className="m-0 max-h-[500px] list-none overflow-auto p-0 pr-4 scrollbar-thin"
							id={listboxId}
							role="listbox"
							aria-describedby={helperId}
							aria-label={`${title} selection list`}
						>
							{entries.map((entry, index) => {
								const isSelected = index === selectedIndex;

								return (
									<li key={entry.title} className="mb-4 last:mb-0">
										<button
											ref={(node) => {
												optionRefs.current[index] = node;
											}}
											type="button"
											role="option"
											aria-selected={isSelected}
											tabIndex={isSelected ? 0 : -1}
											onClick={() => moveSelection(index)}
											onFocus={() => setSelectedIndex(index)}
											onKeyDown={(event) => handleOptionKeyDown(index, event)}
											className={`flex w-full items-center gap-3 border-4 px-4 py-4 text-left transition-all sm:gap-5 sm:px-6 ${
												isSelected
													? "border-line bg-accent shadow-[4px_4px_0_rgba(0,0,0,0.1)]"
													: "border-transparent bg-panel-strong/40 hover:border-line/20"
											}`}
										>
											<span className="w-6 font-dot-gothic text-xl text-accent-strong sm:w-8 sm:text-2xl sm:animate-caret-blink">
												{isSelected ? "▶" : ""}
											</span>
											<span className="text-lg leading-tight sm:text-2xl">{entry.title}</span>
											<span className="ml-auto font-dot-gothic text-sm text-ink-soft uppercase tracking-wider hidden sm:block">
												{entry.meta}
											</span>
										</button>
									</li>
								);
							})}
						</ul>
					</div>
				</div>

				<div className="pixel-card flex flex-col gap-6 bg-panel-strong p-5 sm:p-8">
					<div className="flex flex-col gap-2 font-dot-gothic text-sm uppercase sm:flex-row sm:items-center sm:justify-between sm:text-base">
						<span>{selectedEntry.category}</span>
						<span>{selectedEntry.meta}</span>
					</div>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div className="flex flex-col gap-2">
							<h4 className="m-0 text-2xl leading-tight sm:text-3xl">{selectedEntry.title}</h4>
							<p className="font-dot-gothic text-base text-ink-soft uppercase tracking-wide sm:text-xl">{selectedEntry.role}</p>
						</div>
						{selectedEntry.featured ? (
							<span className="pixel-button bg-accent px-4 py-1 font-dot-gothic text-sm shadow-none!">
								Featured
							</span>
						) : null}
					</div>
					<p className="text-lg leading-relaxed sm:text-2xl">{selectedEntry.blurb}</p>
					<ul className="m-0 mt-2 flex flex-col gap-4 pl-8 list-disc">
						{selectedEntry.highlights.map((highlight) => (
							<li key={highlight} className="text-lg leading-relaxed sm:text-xl">
								{highlight}
							</li>
						))}
					</ul>
					<div className="mt-auto grid gap-6 pt-8">
						{selectedEntry.links.map((link) => (
							<a
								className="pixel-button inline-flex items-center justify-center py-4 text-lg shadow-pixel-strong sm:text-2xl"
								key={link.url}
								href={link.url}
								target="_blank"
								rel="noreferrer"
							>
								Open {link.label}
							</a>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
