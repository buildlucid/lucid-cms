import crypto from "node:crypto";
import constants from "../../../../constants/constants.js";
import type { ServiceContext } from "../../../../utils/services/types.js";

const hashProviderState = (context: ServiceContext, state: string) =>
	crypto
		.createHmac("sha256", context.config.secrets.encryption)
		.update("lucid-auth-provider:state\0", "utf8")
		.update(state, "utf8")
		.digest("hex");

/** Builds the browser cookie name for an authentication-provider flow. */
export const getAuthProviderFlowCookieName = (
	context: ServiceContext,
	state: string,
) =>
	`${constants.cookies.authProviderFlowPrefix}${hashProviderState(context, state)}`;

/** Compares the browser flow state with the callback state in constant time. */
export const authProviderFlowMatches = (
	browserState: string | undefined,
	state: string,
) => {
	if (!browserState) return false;

	const actual = Buffer.from(browserState, "utf8");
	const expected = Buffer.from(state, "utf8");
	return (
		actual.length === expected.length &&
		crypto.timingSafeEqual(actual, expected)
	);
};

/** Builds the short-lived cookie options for a provider callback URL. */
export const getAuthProviderFlowCookieOptions = (callbackUrl: string) => {
	const callback = new URL(callbackUrl);

	return {
		httpOnly: true,
		secure: callback.protocol === "https:",
		sameSite: "lax" as const,
		path: callback.pathname,
		maxAge: Math.floor(constants.authState.ttl / 1000),
	};
};
