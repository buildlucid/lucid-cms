import type { ServiceContext } from "../../../../utils/services/types.js";
import { getLucidRemoteConfig } from "../../origin.js";

/**
 * Returns the package-owned OAuth/API URLs, switching to the server-only
 * loopback override during coordinated local integration tests.
 */
export const getLucidConnectionUrls = (context: ServiceContext) => {
	const { issuer, resource } = getLucidRemoteConfig(context);
	const resourceUrl = new URL(resource);
	const metadataUrl = new URL(resourceUrl.origin);
	const resourcePath = resourceUrl.pathname === "/" ? "" : resourceUrl.pathname;
	metadataUrl.pathname = `/.well-known/oauth-protected-resource${resourcePath}`;
	metadataUrl.search = resourceUrl.search;

	return {
		issuer,
		resource,
		discoveryUrl: `${issuer}/.well-known/oauth-authorization-server`,
		protectedResourceMetadataUrl: metadataUrl.toString(),
		tokenUrl: `${issuer}/v1/oauth/token`,
		registrationUrl: `${issuer}/v1/oauth/register`,
		revocationUrl: `${issuer}/v1/oauth/revoke`,
		connectionUrl: `${issuer}/v1/cms/connection`,
	};
};
