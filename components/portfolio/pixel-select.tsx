"use client";

import { useState } from "react";
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
	const visibleCount = 5;
	const maxWindowStart = Math.max(entries.length - visibleCount, 0);
	const windowStart = clamp(selectedIndex - 2, 0, maxWindowStart);
	const visibleEntries = entries.slice(windowStart, windowStart + visibleCount);
	const selectedEntry = entries[selectedIndex];

	function moveSelection(nextIndex: number) {
		setSelectedIndex(clamp(nextIndex, 0, entries.length - 1));
	}

	function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		switch (event.key) {
			case "ArrowUp":
				event.preventDefault();
				moveSelection(selectedIndex - 1);
				break;
			case "ArrowDown":
				event.preventDefault();
				moveSelection(selectedIndex + 1);
				break;
			case "Home":
				event.preventDefault();
				moveSelection(0);
				break;
			case "End":
				event.preventDefault();
				moveSelection(entries.length - 1);
				break;
			default:
				break;
		}
	}

	return (
		<div className="selection-card">
			<div className="selection-copy">
				<div className="selection-copy__header">
					<p className="pixel-eyebrow">{title}</p>
					<span className="selection-copy__count">
						{selectedIndex + 1}/{entries.length}
					</span>
				</div>
				<h3>{selectedEntry.title}</h3>
				<p className="selection-copy__lede">{selectedEntry.blurb}</p>
				<p>{description}</p>
				<div className="selection-copy__meta">
					<div className="selection-copy__meta-card">
						<span>Category</span>
						<strong>{selectedEntry.category}</strong>
					</div>
					<div className="selection-copy__meta-card">
						<span>Role</span>
						<strong>{selectedEntry.role}</strong>
					</div>
					<div className="selection-copy__meta-card">
						<span>Format</span>
						<strong>{selectedEntry.meta}</strong>
					</div>
					<div className="selection-copy__meta-card">
						<span>Status</span>
						<strong>{selectedEntry.featured ? "Featured" : "Available"}</strong>
					</div>
				</div>
			</div>

			<div
				className="selection-frame"
				tabIndex={0}
				onKeyDown={handleKeyDown}
				aria-label={`${title} selection list`}
			>
				<div className="retro-list">
					<div className="retro-list__header">
						<span>{title}</span>
						<span>
							{selectedIndex + 1}/{entries.length}
						</span>
					</div>

					<div className="retro-list__shell">
						<div className="retro-list__controls">
							<button
								type="button"
								onClick={() => moveSelection(selectedIndex - 1)}
								disabled={selectedIndex === 0}
								aria-label={`Scroll ${title} up`}
							>
								▲
							</button>
							<button
								type="button"
								onClick={() => moveSelection(selectedIndex + 1)}
								disabled={selectedIndex === entries.length - 1}
								aria-label={`Scroll ${title} down`}
							>
								▼
							</button>
						</div>

						<ul className="retro-list__entries">
							{visibleEntries.map((entry, index) => {
								const actualIndex = windowStart + index;
								const isSelected = actualIndex === selectedIndex;

								return (
									<li key={entry.title}>
										<button
											type="button"
											onClick={() => moveSelection(actualIndex)}
											className={isSelected ? "is-selected" : undefined}
										>
											<span className="retro-list__caret">
												{isSelected ? "▶" : ""}
											</span>
											<span className="retro-list__name">{entry.title}</span>
											<span className="retro-list__meta">{entry.meta}</span>
										</button>
									</li>
								);
							})}
						</ul>
					</div>
				</div>

				<div className="detail-card">
					<div className="detail-card__meta">
						<span>{selectedEntry.category}</span>
						<span>{selectedEntry.meta}</span>
					</div>
					<div className="detail-card__header">
						<div>
							<h4>{selectedEntry.title}</h4>
							<p className="detail-card__role">{selectedEntry.role}</p>
						</div>
						{selectedEntry.featured ? (
							<span className="detail-card__badge">Featured</span>
						) : null}
					</div>
					<p>{selectedEntry.blurb}</p>
					<ul className="detail-card__list">
						{selectedEntry.highlights.map((highlight) => (
							<li key={highlight}>{highlight}</li>
						))}
					</ul>
					<div className="detail-card__links">
						{selectedEntry.links.map((link) => (
							<a key={link.url} href={link.url} target="_blank" rel="noreferrer">
								Open {link.label}
							</a>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
