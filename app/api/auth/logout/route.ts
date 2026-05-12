import { clearShuSessionCookie } from "@/lib/shu-session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
	const response = NextResponse.json({ ok: true });

	clearShuSessionCookie(response);
	return response;
}
