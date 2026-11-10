import type { ServiceFn } from "../../utils/services/types.js";

/** HTTP statuses a redirect can be sent with. */
export type RedirectStatus = 301 | 302 | 307 | 308;

/** A path to look up, as the website received it. */
export type RedirectLookup = {
	/** A root-relative path without a query string, such as `/about`. */
	path: string;
	/** The environment the website shows, or `latest`. */
	environment: string;
	/** The visitor's locale, preferred when a path redirects differently per locale. */
	locale?: string;
};

/** Where a redirect sends visitors. */
export type ResolvedRedirect = {
	/** A root-relative path on the website, or a full http(s) address. */
	location: string;
	status: RedirectStatus;
};

/**
 * Returns a redirect or null for a path. Register in config `redirects` or plugin `configure`; the
 * first matching resolver wins.
 */
export type RedirectResolver = ServiceFn<
	[RedirectLookup],
	ResolvedRedirect | null
>;
