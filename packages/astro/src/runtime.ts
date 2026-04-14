import type { LucidConfig, RenderedTemplates } from "@lucidcms/core/types";

const NON_SPA_PREFIXES = [
	"/lucid/api",
	"/lucid/cdn",
	"/lucid/documentation",
	"/lucid/openapi",
	"/lucid/share",
];

export type LucidAstroConfigFactory = (
	env: Record<string, unknown>,
	meta?: {
		emailTemplates?: RenderedTemplates;
	},
) => LucidConfig;

export const createLucidSpaResponse = (
	html: string,
	method: string,
): Response =>
	new Response(method === "HEAD" ? null : html, {
		status: 200,
		headers: {
			"content-type": "text/html; charset=utf-8",
			"cache-control": "no-store",
		},
	});

export const shouldServeLucidSpaShell = (
	pathname: string,
	method: string,
): boolean => {
	if (!pathname.startsWith("/lucid")) {
		return false;
	}

	if (!["GET", "HEAD"].includes(method.toUpperCase())) {
		return false;
	}

	if (
		NON_SPA_PREFIXES.some(
			(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
		)
	) {
		return false;
	}

	const lastSegment = pathname.split("/").pop() ?? "";
	if (lastSegment.includes(".")) {
		return false;
	}

	return true;
};
