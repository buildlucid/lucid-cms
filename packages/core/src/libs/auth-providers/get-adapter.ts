import type { ServiceResponse } from "../../types.js";
import { copy } from "../i18n/index.js";
import createOAuth2Adapter from "./adapters/oauth2/adapter.js";
import createOIDCAdapter from "./adapters/oidc/adapter.js";
import type { AuthAdapter, AuthProvider } from "./types.js";

/**
 * Gets the adapter for a given auth provider
 */
export const getAuthProviderAdapter = (
	provider: AuthProvider,
): Awaited<ServiceResponse<AuthAdapter>> => {
	if (provider.type !== provider.config.type) {
		return {
			error: {
				type: "basic",
				status: 500,
				name: copy("server:core.auth.providers.invalid.config.name"),
				message: copy("server:core.auth.providers.invalid.config.message"),
			},
			data: undefined,
		};
	}

	switch (provider.config.type) {
		case "oauth2":
			return {
				error: undefined,
				data: createOAuth2Adapter(provider.config),
			};
		case "oidc":
			return {
				error: undefined,
				data: createOIDCAdapter(provider.config),
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
