import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getShuApiBaseUrl, getShuWorkspaceId } from "@/lib/shu-config";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const SHU_SESSION_COOKIE = "shu_admin_session";
const SESSION_VERSION = "v1";

export type ShuAdminSession = {
	accessToken: string;
	app: {
		name: string;
	};
	expiresAt: string;
	tokenType: "Bearer";
	workspaceId: string;
	user: {
		email: string | null;
		id: string;
	};
};

function getSessionSecret() {
	const secret = process.env.SHU_SESSION_SECRET ?? process.env.SHU_APP_SECRET;

	if (!secret?.trim()) {
		throw new Error("[shu] Missing SHU_SESSION_SECRET or SHU_APP_SECRET.");
	}

	return createHash("sha256").update(secret.trim()).digest();
}

function encode(value: Buffer) {
	return value.toString("base64url");
}

function decode(value: string) {
	return Buffer.from(value, "base64url");
}

function sealSession(session: ShuAdminSession) {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", getSessionSecret(), iv);
	const plaintext = Buffer.from(JSON.stringify(session), "utf8");
	const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	const tag = cipher.getAuthTag();

	return [SESSION_VERSION, encode(iv), encode(tag), encode(ciphertext)].join(".");
}

function unsealSession(value: string): ShuAdminSession | null {
	const [version, encodedIv, encodedTag, encodedCiphertext] = value.split(".");

	if (version !== SESSION_VERSION || !encodedIv || !encodedTag || !encodedCiphertext) {
		return null;
	}

	try {
		const decipher = createDecipheriv("aes-256-gcm", getSessionSecret(), decode(encodedIv));
		decipher.setAuthTag(decode(encodedTag));
		const plaintext = Buffer.concat([
			decipher.update(decode(encodedCiphertext)),
			decipher.final(),
		]).toString("utf8");
		const session = JSON.parse(plaintext) as ShuAdminSession;

		if (!session.accessToken || !session.user?.id || !session.expiresAt || !session.workspaceId) {
			return null;
		}

		if (new Date(session.expiresAt).getTime() <= Date.now()) {
			return null;
		}

		if (session.workspaceId !== getShuWorkspaceId()) {
			return null;
		}

		return session;
	} catch {
		return null;
	}
}

function getShuSessionValidationUrl(workspaceId: string) {
	const apiBaseUrl = getShuApiBaseUrl().replace(/\/+$/, "");
	return `${apiBaseUrl}/workspaces/${encodeURIComponent(workspaceId)}/external-projects/summary`;
}

async function validateShuSession(session: ShuAdminSession) {
	try {
		const response = await fetch(getShuSessionValidationUrl(session.workspaceId), {
			cache: "no-store",
			headers: {
				Accept: "application/json",
				Authorization: `${session.tokenType} ${session.accessToken}`,
			},
		});

		return response.ok ? session : null;
	} catch {
		return null;
	}
}

export async function getShuSessionFromCookies() {
	const cookieStore = await cookies();
	const value = cookieStore.get(SHU_SESSION_COOKIE)?.value;
	const session = value ? unsealSession(value) : null;

	return session ? validateShuSession(session) : null;
}

export function setShuSessionCookie(response: NextResponse, session: ShuAdminSession) {
	response.cookies.set(SHU_SESSION_COOKIE, sealSession(session), {
		expires: new Date(session.expiresAt),
		httpOnly: true,
		path: "/",
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
	});
}

export function clearShuSessionCookie(response: NextResponse) {
	response.cookies.set(SHU_SESSION_COOKIE, "", {
		expires: new Date(0),
		httpOnly: true,
		path: "/",
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
	});
}
