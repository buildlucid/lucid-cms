import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/**
 * Builds the canonical URLs advertised by the Lucid OAuth server.
 */
export const getOAuthUrls = (context: ServiceContext) => {
	const origin = new URL(getBaseUrl(context)).origin;
	const issuer = `${origin}/lucid`;
	const resource = `${origin}/lucid/api/v1/client`;

	return {
		issuer,
		resource,
		authorizationEndpoint: `${origin}/lucid/oauth/authorize`,
		tokenEndpoint: `${origin}/lucid/oauth/token`,
		revocationEndpoint: `${origin}/lucid/oauth/revoke`,
		authorizationServerMetadata: `${origin}/.well-known/oauth-authorization-server/lucid`,
		protectedResourceMetadata: `${origin}/.well-known/oauth-protected-resource/lucid/api/v1/client`,
		consentPage: `${origin}/lucid/oauth/consent`,
	};
};

/**
 * Builds an OAuth authorization error redirect for a validated client URI.
 */
export const getOAuthAuthorizationErrorUrl = (
	context: ServiceContext,
	redirectUri: string,
	state: string,
	error: "invalid_request" | "invalid_scope" | "unsupported_response_type",
) => {
	const redirect = new URL(redirectUri);
	redirect.searchParams.set("error", error);
	redirect.searchParams.set("state", state);
	redirect.searchParams.set("iss", getOAuthUrls(context).issuer);
	return redirect.toString();
};

/**
 * Checks whether a resource matches the API exposed by the OAuth server.
 */
export const isSupportedOAuthResource = (
	context: ServiceContext,
	resource: string,
) => resource === getOAuthUrls(context).resource;
