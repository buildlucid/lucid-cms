import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";

export type OAuthResource = "content" | "mcp";

/**
 * Builds the canonical URLs advertised by the Lucid OAuth server.
 */
export const getOAuthUrls = (context: ServiceContext) => {
	const origin = new URL(getBaseUrl(context)).origin;

	const resource = (path: string) => ({
		resource: `${origin}${path}`,
		metadata: `${origin}/.well-known/oauth-protected-resource${path}`,
	});

	const resources = {
		content: resource("/lucid/api/v1/content"),
		mcp: resource("/lucid/mcp"),
	} satisfies Record<OAuthResource, ReturnType<typeof resource>>;

	return {
		issuer: `${origin}/lucid`,
		resources,
		authorizationEndpoint: `${origin}/lucid/oauth/authorize`,
		tokenEndpoint: `${origin}/lucid/oauth/token`,
		revocationEndpoint: `${origin}/lucid/oauth/revoke`,
		authorizationServerMetadata: `${origin}/.well-known/oauth-authorization-server/lucid`,
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
) => {
	const { resources } = getOAuthUrls(context);

	return (
		resource === resources.content.resource ||
		(context.config.mcp.enabled && resource === resources.mcp.resource)
	);
};
