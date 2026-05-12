export const SHU_APP_NAME = "shu";

export type ShuAdminTargetKey = "dashboard" | "library" | "preview" | "members" | "settings";

type ShuAdminTarget = {
	actionLabel: string;
	description: string;
	key: ShuAdminTargetKey;
	label: string;
	pathSuffix: string;
};

export const SHU_ADMIN_TARGETS: ShuAdminTarget[] = [
	{
		actionLabel: "Open CMS Home",
		description: "Review workspace status and jump into the content studio.",
		key: "dashboard",
		label: "CMS Home",
		pathSuffix: "",
	},
	{
		actionLabel: "Manage Library",
		description: "Edit profile copy, projects, games, contact links, and portfolio assets.",
		key: "library",
		label: "Library",
		pathSuffix: "/library",
	},
	{
		actionLabel: "Preview Delivery",
		description: "Inspect the delivered Shu payload before publishing.",
		key: "preview",
		label: "Preview",
		pathSuffix: "/preview",
	},
	{
		actionLabel: "Manage Members",
		description: "Open CMS workspace membership and collaborator access.",
		key: "members",
		label: "Members",
		pathSuffix: "/members",
	},
	{
		actionLabel: "Open Settings",
		description: "Tune the external project binding and workspace settings.",
		key: "settings",
		label: "Settings",
		pathSuffix: "/settings",
	},
];

function isEnabled(value: string | undefined) {
	return value ? ["1", "true", "yes", "on"].includes(value.trim().toLowerCase()) : false;
}

function trimTrailingSlash(value: string) {
	return value.replace(/\/+$/, "");
}

function getAdminDevMode() {
	return isEnabled(process.env.DEV_MODE ?? process.env.NEXT_PUBLIC_DEV_MODE);
}

function getConfiguredUrl({
	envName,
	localUrl,
	productionUrl,
}: {
	envName: string;
	localUrl: string;
	productionUrl: string;
}) {
	const configured = process.env[envName] ?? process.env[`NEXT_PUBLIC_${envName}`];

	if (configured?.trim()) {
		return trimTrailingSlash(configured.trim());
	}

	return getAdminDevMode() ? localUrl : productionUrl;
}

export function getShuApiBaseUrl() {
	return (
		process.env.TUTURUUU_API_BASE_URL ??
		process.env.NEXT_PUBLIC_TUTURUUU_API_BASE_URL ??
		"https://tuturuuu.com/api/v1"
	);
}

export function getShuWorkspaceId() {
	const workspaceId =
		process.env.TUTURUUU_SHU_WORKSPACE_ID ?? process.env.NEXT_PUBLIC_TUTURUUU_SHU_WORKSPACE_ID;

	if (!workspaceId?.trim()) {
		throw new Error("[shu] Missing TUTURUUU_SHU_WORKSPACE_ID.");
	}

	return workspaceId.trim();
}

export function getShuAppId() {
	return (process.env.SHU_APP_ID ?? SHU_APP_NAME).trim().toLowerCase();
}

export function getShuAppSecret() {
	const secret = process.env.SHU_APP_SECRET ?? process.env.TUTURUUU_SHU_APP_SECRET;

	if (!secret?.trim()) {
		throw new Error("[shu] Missing SHU_APP_SECRET.");
	}

	return secret.trim();
}

export function getShuCmsBaseUrl() {
	return getConfiguredUrl({
		envName: "TUTURUUU_CMS_APP_URL",
		localUrl: "http://localhost:7811",
		productionUrl: "https://cms.tuturuuu.com",
	});
}

export function getShuWebAppUrl() {
	return getConfiguredUrl({
		envName: "TUTURUUU_WEB_APP_URL",
		localUrl: "http://localhost:7803",
		productionUrl: "https://tuturuuu.com",
	});
}

export function getShuAppBaseUrl(requestOrigin?: string) {
	const configured =
		process.env.SHU_APP_URL ?? process.env.NEXT_PUBLIC_SHU_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;

	if (configured?.trim()) {
		return trimTrailingSlash(configured.trim());
	}

	if (requestOrigin?.trim()) {
		return trimTrailingSlash(requestOrigin.trim());
	}

	if (process.env.VERCEL_URL?.trim()) {
		return `https://${trimTrailingSlash(process.env.VERCEL_URL.trim())}`;
	}

	return "http://localhost:3000";
}

export function sanitizeShuNextPath(
	rawValue: string | null | undefined,
	requestOrigin = "http://localhost",
	fallbackPath = "/admin",
) {
	if (!rawValue?.trim() || rawValue.startsWith("//")) {
		return fallbackPath;
	}

	try {
		const parsed = new URL(rawValue, requestOrigin);

		if (parsed.origin !== requestOrigin) {
			return fallbackPath;
		}

		return `${parsed.pathname}${parsed.search}`;
	} catch {
		return fallbackPath;
	}
}

export function resolveShuAdminTargetKey(value: string | null | undefined): ShuAdminTargetKey {
	return SHU_ADMIN_TARGETS.some((target) => target.key === value)
		? (value as ShuAdminTargetKey)
		: "library";
}

export function getShuAdminTarget(key: ShuAdminTargetKey) {
	return SHU_ADMIN_TARGETS.find((target) => target.key === key) ?? SHU_ADMIN_TARGETS[1];
}

export function getShuCmsWorkspacePath(
	targetKey: ShuAdminTargetKey,
	workspaceId = getShuWorkspaceId(),
) {
	const target = getShuAdminTarget(targetKey);
	return `/${encodeURIComponent(workspaceId)}${target.pathSuffix}`;
}

export function buildShuCmsUrl({
	cmsBaseUrl = getShuCmsBaseUrl(),
	targetKey,
	workspaceId = getShuWorkspaceId(),
}: {
	cmsBaseUrl?: string;
	targetKey: ShuAdminTargetKey;
	workspaceId?: string;
}) {
	return new URL(getShuCmsWorkspacePath(targetKey, workspaceId), cmsBaseUrl).toString();
}

export function buildShuCentralizedLoginUrl({
	appBaseUrl = getShuAppBaseUrl(),
	nextUrl = "/admin",
	webAppUrl = getShuWebAppUrl(),
}: {
	appBaseUrl?: string;
	nextUrl?: string;
	webAppUrl?: string;
}) {
	const appOrigin = new URL(appBaseUrl).origin;
	const verifyUrl = new URL("/verify-token", appOrigin);
	verifyUrl.searchParams.set("nextUrl", sanitizeShuNextPath(nextUrl, appOrigin));

	const loginUrl = new URL("/login", webAppUrl);
	loginUrl.searchParams.set("returnUrl", verifyUrl.toString());
	return loginUrl.toString();
}

export function getShuAdminLoginPath(targetKey: ShuAdminTargetKey) {
	return `/admin/login?next=${encodeURIComponent(targetKey)}`;
}

export function buildShuAdminLinks(workspaceId = getShuWorkspaceId()) {
	const cmsBaseUrl = getShuCmsBaseUrl();

	return SHU_ADMIN_TARGETS.map((target) => ({
		...target,
		cmsHref: buildShuCmsUrl({
			cmsBaseUrl,
			targetKey: target.key,
			workspaceId,
		}),
		loginHref: getShuAdminLoginPath(target.key),
	}));
}
