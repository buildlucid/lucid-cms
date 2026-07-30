import collections from "../../libs/collection/collections.js";
import { getValidExternalScopes } from "../../libs/permission/scopes.js";
import type { OAuthAuthorizationServerMetadataResponse } from "../../schemas/oauth.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { getOAuthUrls } from "./helpers/urls.js";

/** Builds the OAuth authorization-server metadata document. */
const getAuthorizationServerMetadata: ServiceFn<
	[],
	OAuthAuthorizationServerMetadataResponse
> = async (context) => {
	const urls = getOAuthUrls(context);
	const collectionsRes = await collections.getAll(context, {});
	if (collectionsRes.error) return collectionsRes;

	return {
		error: undefined,
		data: {
			issuer: urls.issuer,
			authorization_endpoint: urls.authorizationEndpoint,
			token_endpoint: urls.tokenEndpoint,
			revocation_endpoint: urls.revocationEndpoint,
			response_types_supported: ["code"],
			grant_types_supported: ["authorization_code", "refresh_token"],
			code_challenge_methods_supported: ["S256"],
			token_endpoint_auth_methods_supported: ["none", "client_secret_basic"],
			revocation_endpoint_auth_methods_supported: [
				"none",
				"client_secret_basic",
			],
			authorization_response_iss_parameter_supported: true,
			scopes_supported: getValidExternalScopes(collectionsRes.data),
			client_id_metadata_document_supported: true,
		},
	};
};

export default getAuthorizationServerMetadata;
