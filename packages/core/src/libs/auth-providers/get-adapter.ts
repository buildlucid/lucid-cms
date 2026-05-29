import type { ServiceResponse } from "../../types.js";
import { copy } from "../i18n/index.js";
import createOIDCAdapter from "./adapters/oidc-adapter.js";
import type { AuthAdapter, AuthProvider, OIDCAuthConfig } from "./types.js";

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
		default:
			return {
				error: {
					type: "basic",
					status: 500,
					name: copy("server:core.auth.providers.not.found.name"),
					message: copy("server:core.auth.providers.not.found.message"),
				},
				data: undefined,
			};
	}
};

export default getAuthProviderAdapter;
