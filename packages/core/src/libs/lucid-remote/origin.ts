import constants from "../../constants/constants.js";
import type { ServiceContext } from "../../utils/services/types.js";

export const LUCID_REMOTE_API_OVERRIDE_ENV =
	"LUCID_CMS_INTERNAL_REMOTE_API_URL_OVERRIDE";

const isLoopback = (hostname: string) =>
	hostname === "localhost" ||
	hostname === "127.0.0.1" ||
	hostname === "[::1]" ||
	hostname === "::1" ||
	hostname.startsWith("127.");

const parseApiOrigin = (value: string, label: string) => {
	const url = new URL(value);
	if (
		url.username ||
		url.password ||
		url.search ||
		url.hash ||
		(url.pathname !== "/" && url.pathname !== "") ||
		(url.protocol !== "https:" &&
			!(url.protocol === "http:" && isLoopback(url.hostname)))
	) {
		throw new Error(
			`${label} must be an HTTPS origin, or an HTTP loopback origin.`,
		);
	}
	return url.origin;
};

/**
 * Resolves Lucid's internal OAuth/API endpoints for the current runtime.
 *
 * Production uses package-owned constants. The server-only override switches
 * both issuer and protected resource to a loopback Website API for local E2E.
 */
export const getLucidRemoteConfig = (context: ServiceContext) => {
	const override = context.env?.[LUCID_REMOTE_API_OVERRIDE_ENV];
	if (typeof override === "string" && override.trim()) {
		const issuer = parseApiOrigin(override.trim(), "Lucid remote API override");
		return {
			issuer,
			resource: `${issuer}/v1/cms`,
		};
	}

	return {
		issuer: constants.endpoints.lucidRemoteApiDomain,
		resource: `${constants.endpoints.lucidRemoteApiDomain}/v1/cms`,
	};
};
