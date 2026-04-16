import type { LucidConfig, RenderedTemplates } from "@lucidcms/core/types";
import {
	HTML_CONTENT_TYPE,
	HTTP_METHOD_HEAD,
	HTTP_STATUS_OK,
	LUCID_MOUNT_PATH,
	LUCID_NON_SPA_PREFIXES,
	NO_STORE_CACHE_CONTROL,
	SPA_SHELL_METHODS,
} from "./constants.js";

export type LucidAstroConfigFactory = (
	env: Record<string, unknown>,
	meta?: {
		emailTemplates?: RenderedTemplates;
	},
) => LucidConfig;

/**
 * Lucid's admin app is still an SPA inside Astro, so client-side routes need a
 * response that disables caching and behaves correctly for HEAD requests.
 */
export const createLucidSpaResponse = (
	html: string,
	method: string,
): Response => {
	return new Response(method === HTTP_METHOD_HEAD ? null : html, {
		status: HTTP_STATUS_OK,
		headers: {
			"content-type": HTML_CONTENT_TYPE,
			"cache-control": NO_STORE_CACHE_CONTROL,
		},
	});
};

/**
 * Astro only falls back to the SPA shell for Lucid client routes. API and
 * asset paths stay explicit so their status codes remain trustworthy.
 */
export const shouldServeLucidSpaShell = (
	pathname: string,
	method: string,
): boolean => {
	if (!pathname.startsWith(LUCID_MOUNT_PATH)) {
		return false;
	}

	if (!SPA_SHELL_METHODS.includes(method.toUpperCase() as never)) {
		return false;
	}

	if (
		LUCID_NON_SPA_PREFIXES.some(
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
