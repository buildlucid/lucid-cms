import type { LucidConfig, RenderedTemplates } from "@lucidcms/core/types";
import astroConstants, { lucidNonSpaPrefixes } from "./constants.js";

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
	return new Response(method === astroConstants.http.headMethod ? null : html, {
		status: astroConstants.http.okStatus,
		headers: {
			"content-type": astroConstants.http.htmlContentType,
			"cache-control": astroConstants.http.noStoreCacheControl,
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
	if (!pathname.startsWith(astroConstants.paths.mountPath)) {
		return false;
	}

	if (
		!astroConstants.http.spaShellMethods.includes(method.toUpperCase() as never)
	) {
		return false;
	}

	if (
		lucidNonSpaPrefixes.some(
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

export {
	maybeInjectLucidAdminBar,
	shouldInjectLucidAdminBar,
} from "./internal/admin-bar/middleware.js";
export {
	buildLucidAdminBarEditHref,
	normalizeLucidAdminBarOptions,
	readLucidAdminBarContext,
} from "./internal/admin-bar/shared.js";
