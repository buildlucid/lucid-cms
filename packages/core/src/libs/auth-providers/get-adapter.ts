import type {
	AuthAdapter,
	AuthProvider,
	OIDCAuthConfig,
	SAMLAuthConfig,
} from "./types.js";
import createOIDCAdapter from "./adapters/oidc-adapter.js";
import createSAMLAdapter from "./adapters/saml-adapter.js";
import type { ServiceResponse } from "../../types.js";
import T from "../../translations/index.js";

/**
 * Gets the adapter for a given auth provider
 */
export const getAuthProviderAdapter = (
	provider: AuthProvider,
): Awaited<ServiceResponse<AuthAdapter>> => {
	switch (provider.type) {
		case "oidc":
			return {
				error: undefined,
				data: createOIDCAdapter(provider.config as OIDCAuthConfig),
			};
		case "saml":
			return {
				error: undefined,
				data: createSAMLAdapter(provider.config as SAMLAuthConfig),
			};
		default:
			return {
				error: {
					type: "basic",
					status: 500,
					name: T("provider_not_found_name"),
					message: T("provider_not_found_message"),
				},
				data: undefined,
			};
	}
};

export default getAuthProviderAdapter;
