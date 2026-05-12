import { VerifyTokenClient } from "@/components/VerifyTokenClient";
import { Suspense } from "react";

function VerifyTokenFallback() {
	return (
		<>
			<div className="pixel-card flex size-12 items-center justify-center bg-white/10 text-white">
				...
			</div>
			<h1 className="mt-5 text-3xl font-black text-white">Connecting Shu</h1>
			<p className="mt-3 text-sm leading-6 text-white/64">
				Finishing centralized Tuturuuu authentication.
			</p>
		</>
	);
}

export default function VerifyTokenPage() {
	return (
		<main className="grid min-h-screen place-items-center bg-ink px-6 text-white">
			<section className="pixel-card w-full max-w-md bg-panel-dark p-8">
				<Suspense fallback={<VerifyTokenFallback />}>
					<VerifyTokenClient />
				</Suspense>
			</section>
		</main>
	);
}
