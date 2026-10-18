import constants from "../../constants/constants.js";

const mountPath = constants.paths.admin;

/** Matches the admin app's paths. */
export const isAdminPath = (pathname: string) =>
	pathname === mountPath || pathname.startsWith(`${mountPath}/`);

/** Only navigation requests may fall back to the SPA; missing assets stay missing. */
export const shouldServeAdminShell = (pathname: string, method: string) =>
	(method === "GET" || method === "HEAD") &&
	isAdminPath(pathname) &&
	!pathname.split("/").some((segment) => segment.startsWith("@")) &&
	!pathname.startsWith(`${mountPath}/src/`) &&
	!pathname.startsWith(`${mountPath}/node_modules/`) &&
	!pathname.startsWith(`${mountPath}/_assets/`) &&
	!pathname.split("/").at(-1)?.includes(".");

/** Creates the uncached HTML response used by standalone and hosted runtimes. */
export const createAdminShellResponse = (html: string, method: string) =>
	new Response(method === "HEAD" ? null : html, {
		headers: {
			"Cache-Control": "no-store",
			"Content-Type": "text/html; charset=utf-8",
			"X-Robots-Tag": "noindex, nofollow",
		},
	});
