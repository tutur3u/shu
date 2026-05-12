import { buildShuCentralizedLoginUrl, resolveShuAdminTargetKey } from "@/lib/shu-config";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
	const targetKey = resolveShuAdminTargetKey(request.nextUrl.searchParams.get("next"));
	const nextUrl = targetKey === "dashboard" ? "/admin" : `/admin?target=${targetKey}`;

	return NextResponse.redirect(
		buildShuCentralizedLoginUrl({
			appBaseUrl: request.nextUrl.origin,
			nextUrl,
		}),
	);
}
