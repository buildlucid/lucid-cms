import { getLucidConnectionUrls } from "../../../libs/lucid-remote/services/connection/index.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";

const isSecureConnectionUrl = (url: URL) =>
	url.protocol === "https:" ||
	(url.protocol === "http:" &&
		(url.hostname === "localhost" ||
			url.hostname === "127.0.0.1" ||
			url.hostname === "[::1]" ||
			url.hostname === "::1" ||
			url.hostname.startsWith("127.")));

/** Builds the canonical CMS callback and internal Lucid Website URLs. */
export const getConnectionUrls = (context: ServiceContext) => {
	const host = new URL(getBaseUrl(context));
	if (
		host.username ||
		host.password ||
		host.search ||
		host.hash ||
		(host.pathname !== "/" && host.pathname !== "")
	) {
		throw new Error("The CMS host must be an origin without a path or query.");
	}
	if (!isSecureConnectionUrl(host)) {
		throw new Error("The CMS OAuth callback must use HTTPS outside loopback.");
	}

	const cmsOrigin = host.origin;

	return {
		...getLucidConnectionUrls(context),
		cmsOrigin,
		callbackUrl: `${cmsOrigin}/lucid/api/v1/connection/callback`,
		connectionPageUrl: `${cmsOrigin}/lucid/system/integrations`,
	};
};

/** Adds a non-sensitive OAuth result to the connection-page redirect. */
export const buildConnectionResultUrl = (
	context: ServiceContext,
	result: "connected" | "denied" | "expired" | "failed",
	errorKey?: string,
) => {
	const target = new URL(getConnectionUrls(context).connectionPageUrl);
	target.searchParams.set("result", result);
	if (errorKey) target.searchParams.set("error", errorKey);
	return target.toString();
};
