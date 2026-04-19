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
		<div className="game-shelf">
			<section className="window-hero window-hero--compact arcade-hero">
				<div className="window-kicker-row">
					<p className="pixel-eyebrow">{title}</p>
					<span className="window-status">
						{selectedIndex + 1}/{entries.length}
					</span>
				</div>
				<div className="window-hero__split">
					<div className="window-hero__body">
						<h3>{selectedEntry.title}</h3>
						<p className="window-hero__lede">{selectedEntry.role}</p>
						<p>{selectedEntry.blurb}</p>
					</div>

					<div className="window-chip-row">
						<div className="window-chip">
							<span>Category</span>
							<strong>{selectedEntry.category}</strong>
						</div>
						<div className="window-chip">
							<span>Role</span>
							<strong>{selectedEntry.role}</strong>
						</div>
						<div className="window-chip">
							<span>Format</span>
							<strong>{selectedEntry.meta}</strong>
						</div>
						<div className="window-chip">
							<span>Primary Link</span>
							<strong>{selectedEntry.links[0]?.label ?? "Unavailable"}</strong>
						</div>
					</div>
				</div>
				<p className="arcade-hero__caption">{description}</p>
			</section>

			<div className="window-grid game-shelf__layout">
				<section className="window-panel arcade-panel">
					<div className="arcade-panel__header">
						<div>
							<p className="pixel-eyebrow">Arcade Picker</p>
							<h4>Choose A Build</h4>
						</div>
						<span className="window-panel__badge">Keyboard Ready</span>
					</div>

					<div className="arcade-panel__subheader">
						<div className="arcade-panel__legend" id={helperId}>
							<span className="arcade-panel__legend-pill">↑↓ Move</span>
							<span className="arcade-panel__legend-pill">Home/End Jump</span>
							<span className="arcade-panel__legend-pill">Type Search</span>
							<span className="arcade-panel__legend-pill">Enter Launch</span>
						</div>
						<div className="arcade-panel__actions">
							<button
								type="button"
								onClick={() => moveSelection(selectedIndex - 1, true)}
								disabled={selectedIndex === 0}
								aria-label="Select previous game"
							>
								Prev
							</button>
							<button
								type="button"
								onClick={() => moveSelection(selectedIndex + 1, true)}
								disabled={selectedIndex === entries.length - 1}
								aria-label="Select next game"
							>
								Next
							</button>
						</div>
					</div>

					<ul
						aria-describedby={helperId}
						aria-label="Game shelf picker"
						className="arcade-list"
						id={listboxId}
						role="listbox"
					>
						{entries.map((entry, index) => {
							const isSelected = index === selectedIndex;

							return (
								<li key={entry.title}>
									<button
										ref={(node) => {
											optionRefs.current[index] = node;
										}}
										aria-selected={isSelected}
										className={`arcade-list__option ${isSelected ? "is-selected" : ""}`}
										onClick={() => moveSelection(index)}
										onFocus={() => setSelectedIndex(index)}
										onKeyDown={(event) => handleOptionKeyDown(index, event)}
										role="option"
										tabIndex={isSelected ? 0 : -1}
										type="button"
									>
										<span className="arcade-list__index">
											{String(index + 1).padStart(2, "0")}
										</span>
										<span className="arcade-list__copy">
											<span className="arcade-list__title-row">
												<strong>{entry.title}</strong>
												{isSelected ? (
													<span className="arcade-list__active">Selected</span>
												) : null}
											</span>
											<span>{entry.category}</span>
										</span>
										<span className="arcade-list__meta">{entry.meta}</span>
									</button>
								</li>
							);
						})}
					</ul>
				</section>

				<section className="window-panel arcade-detail">
					<div className="arcade-detail__masthead">
						<div className="arcade-detail__title-block">
							<p className="pixel-eyebrow">Now Highlighted</p>
							<div className="arcade-detail__title-row">
								<h4>{selectedEntry.title}</h4>
								<span className="window-panel__badge">{selectedEntry.meta}</span>
							</div>
							<p className="arcade-detail__role">{selectedEntry.role}</p>
						</div>
						<div className="arcade-detail__stamp" aria-hidden="true">
							{String(selectedIndex + 1).padStart(2, "0")}
						</div>
					</div>

					<div className="arcade-detail__summary-card">
						<p className="pixel-eyebrow">Build Readout</p>
						<p className="arcade-detail__summary">{selectedEntry.blurb}</p>
					</div>

					<div className="arcade-detail__signal-grid">
						<div className="arcade-detail__signal-card">
							<span>Category</span>
							<strong>{selectedEntry.category}</strong>
						</div>
						<div className="arcade-detail__signal-card">
							<span>Primary Link</span>
							<strong>{primaryLink?.label ?? "Unavailable"}</strong>
						</div>
					</div>

					<section className="arcade-detail__section">
						<div className="arcade-detail__section-head">
							<p className="pixel-eyebrow">Why Open This</p>
							<span className="arcade-detail__section-count">
								{selectedEntry.highlights.length} notes
							</span>
						</div>

						<div className="arcade-detail__highlight-grid">
							{selectedEntry.highlights.map((highlight, index) => (
								<article className="arcade-detail__highlight-card" key={highlight}>
									<span>{String(index + 1).padStart(2, "0")}</span>
									<p>{highlight}</p>
								</article>
							))}
						</div>
					</section>

					<div className="arcade-detail__footer">
						{primaryLink ? (
							<a
								className="route-link arcade-detail__primary"
								href={primaryLink.url}
								target="_blank"
								rel="noreferrer"
							>
								Play {primaryLink.label}
							</a>
						) : null}

						{secondaryLinks.length ? (
							<div className="arcade-detail__links">
								{secondaryLinks.map((link) => (
									<a
										className="route-link route-link--secondary"
										href={link.url}
										key={link.url}
										target="_blank"
										rel="noreferrer"
									>
										Open {link.label}
									</a>
								))}
							</div>
						) : null}

						<p className="arcade-detail__hint">
							Press <kbd>Enter</kbd> from the picker to launch the primary build instantly.
						</p>
					</div>
				</section>
			</div>
		</div>
	);
}
