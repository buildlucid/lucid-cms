import collections from "../../libs/collection/collections.js";
import { getValidExternalScopes } from "../../libs/permission/scopes.js";
import type { OAuthProtectedResourceMetadataResponse } from "../../schemas/oauth.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { getOAuthUrls } from "./helpers/urls.js";

/** Builds the OAuth protected-resource metadata document. */
const getProtectedResourceMetadata: ServiceFn<
	[],
	OAuthProtectedResourceMetadataResponse
> = async (context) => {
	const urls = getOAuthUrls(context);
	const collectionsRes = await collections.getAll(context, {});
	if (collectionsRes.error) return collectionsRes;

	return {
		error: undefined,
		data: {
			resource: urls.resource,
			authorization_servers: [urls.issuer],
			bearer_methods_supported: ["header"],
			scopes_supported: getValidExternalScopes(collectionsRes.data),
		},
	};
};

export default getProtectedResourceMetadata;
