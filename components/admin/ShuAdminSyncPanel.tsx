"use client";

import { useState } from "react";

async function readAdminError(response: Response) {
	const data = (await response.json().catch(() => null)) as { error?: unknown } | null;
	return typeof data?.error === "string" && data.error.trim()
		? data.error
		: `Request failed with status ${response.status}`;
}

async function postAdminJson<T>(url: string, body?: unknown) {
	const response = await fetch(url, {
		body: body === undefined ? undefined : JSON.stringify(body),
		cache: "no-store",
		headers: {
			Accept: "application/json",
			...(body === undefined ? {} : { "Content-Type": "application/json" }),
		},
		method: "POST",
	});

	if (!response.ok) {
		throw new Error(await readAdminError(response));
	}

	return (await response.json()) as T;
}

type SyncDiffResponse = {
	hasDestructiveOperations?: boolean;
	operations?: unknown[];
	summary?: {
		archive?: number;
		create?: number;
		delete?: number;
		noop?: number;
		update?: number;
	};
};

export function ShuAdminSyncPanel() {
	const [diff, setDiff] = useState<SyncDiffResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pendingAction, setPendingAction] = useState<"apply" | "diff" | null>(null);
	const [publicAssetSync, setPublicAssetSync] = useState<{
		skipped?: unknown[];
		uploaded?: unknown[];
	} | null>(null);
	const summary = diff?.summary;
	const totalOperations =
		(summary?.archive ?? 0) +
		(summary?.create ?? 0) +
		(summary?.delete ?? 0) +
		(summary?.update ?? 0);

	const runDiff = async () => {
		setPendingAction("diff");
		setError(null);
		setPublicAssetSync(null);
		try {
			setDiff(await postAdminJson<SyncDiffResponse>("/api/admin/sync/diff"));
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : "Sync request failed.");
		} finally {
			setPendingAction(null);
		}
	};

	const runApply = async (force: boolean) => {
		setPendingAction("apply");
		setError(null);
		try {
			const result = await postAdminJson<{
				diff?: SyncDiffResponse;
				publicAssetSync?: {
					skipped?: unknown[];
					uploaded?: unknown[];
				};
			}>("/api/admin/sync/apply", { force });
			setPublicAssetSync(result.publicAssetSync ?? null);
			setDiff(result.diff ?? (await postAdminJson<SyncDiffResponse>("/api/admin/sync/diff")));
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : "Sync request failed.");
		} finally {
			setPendingAction(null);
		}
	};

	return (
		<section className="pixel-card flex flex-col gap-4 bg-panel-dark p-6 text-white">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<div>
					<p className="pixel-eyebrow text-white/60">Tuturuuu sync</p>
					<h2 className="font-dot-gothic text-2xl leading-tight">CMS Migration Control</h2>
					<p className="mt-2 max-w-2xl text-base leading-relaxed text-white/68">
						Diff and push the Shu manifest, including local public folder assets, into the
						Tuturuuu external-project workspace.
					</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<button
						className="pixel-button bg-white px-4 py-3 text-sm text-ink disabled:opacity-50"
						disabled={pendingAction !== null}
						onClick={runDiff}
						type="button"
					>
						{pendingAction === "diff" ? "Checking..." : "Check sync"}
					</button>
					<button
						className="pixel-button bg-accent px-4 py-3 text-sm text-ink disabled:opacity-50"
						disabled={pendingAction !== null}
						onClick={() => void runApply(false)}
						type="button"
					>
						{pendingAction === "apply" ? "Pushing..." : "Push manifest"}
					</button>
				</div>
			</div>

			{diff ? (
				<div className="grid gap-2 text-sm sm:grid-cols-4">
					{[
						["Create", summary?.create ?? 0],
						["Update", summary?.update ?? 0],
						["Archive", summary?.archive ?? 0],
						["Delete", summary?.delete ?? 0],
					].map(([label, value]) => (
						<div className="pixel-card bg-white/8 px-3 py-2" key={label}>
							<span className="text-white/58">{label}</span>
							<span className="float-right font-black text-white">{value}</span>
						</div>
					))}
				</div>
			) : null}

			{diff?.hasDestructiveOperations ? (
				<div className="pixel-card flex flex-wrap items-center justify-between gap-3 border-red-300 bg-red-500/12 px-3 py-2 text-sm text-red-100">
					<span>Destructive operations require explicit force.</span>
					<button
						className="pixel-button px-3 py-2 text-xs"
						disabled={pendingAction !== null}
						onClick={() => void runApply(true)}
						type="button"
					>
						Force apply
					</button>
				</div>
			) : null}

			{diff && !diff.hasDestructiveOperations ? (
				<p className="text-sm text-white/64">
					{totalOperations === 0 ? "Manifest is already in sync." : `${totalOperations} changes ready.`}
				</p>
			) : null}

			{publicAssetSync ? (
				<p className="text-sm text-white/64">
					Uploaded {publicAssetSync.uploaded?.length ?? 0} public assets
					{publicAssetSync.skipped?.length ? `, skipped ${publicAssetSync.skipped.length}` : ""}.
				</p>
			) : null}

			{error ? (
				<div className="pixel-card border-red-300 bg-red-500/12 px-3 py-2 text-sm text-red-100">
					{error}
				</div>
			) : null}
		</section>
	);
}
