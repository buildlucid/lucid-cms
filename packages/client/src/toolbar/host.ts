import { lucidMountPath } from "./constants.js";

/** Normalizes the public Lucid host to an HTTP(S) origin. */
export const normalizeToolbarHost = (host: string | URL): URL => {
	const value = String(host).trim();
	const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(value);
	const url = new URL(hasScheme ? value : `https://${value}`);
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new TypeError("Lucid toolbar host must use HTTP or HTTPS.");
	}
	return new URL(url.origin);
};

/** Resolves the Lucid host, defaulting to the current page origin. */
export const resolveToolbarHost = (
	targetWindow: Window,
	host?: string | URL,
): URL =>
	host === undefined
		? new URL(targetWindow.location.origin)
		: normalizeToolbarHost(host);

/** Builds the root Lucid admin URL for a host. */
export const getToolbarAdminUrl = (host: URL): URL =>
	new URL(lucidMountPath, host);

/** Builds the root Lucid admin href for a configured host. */
export const getToolbarAdminHref = (host?: string | URL): string =>
	host === undefined
		? lucidMountPath
		: `${normalizeToolbarHost(host).origin}${lucidMountPath}`;
