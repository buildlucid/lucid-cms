const mountPath = "/lucid";

const serverPrefixes = ["api", "cdn", "documentation", "openapi"].map(
	(segment) => `${mountPath}/${segment}`,
);

/** Keeps server endpoints outside the admin application's fallback. */
export const isAdminPath = (pathname: string) =>
	(pathname === mountPath || pathname.startsWith(`${mountPath}/`)) &&
	!serverPrefixes.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);

/** Only navigation requests may fall back to the SPA; missing assets stay missing. */
export const shouldServeAdminShell = (pathname: string, method: string) =>
	(method === "GET" || method === "HEAD") &&
	isAdminPath(pathname) &&
	!pathname.split("/").some((segment) => segment.startsWith("@")) &&
	!pathname.startsWith(`${mountPath}/src/`) &&
	!pathname.startsWith(`${mountPath}/node_modules/`) &&
	!pathname.startsWith(`${mountPath}/assets/`) &&
	!pathname.split("/").at(-1)?.includes(".");

/** Creates the uncached HTML response used by standalone and hosted runtimes. */
export const createAdminShellResponse = (html: string, method: string) =>
	new Response(method === "HEAD" ? null : html, {
		headers: {
			"Cache-Control": "no-store",
			"Content-Type": "text/html; charset=utf-8",
		},
	});
