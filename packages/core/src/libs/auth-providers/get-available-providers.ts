import type { ResolvedLucidConfig } from "../../exports/types.js";

/**
 * Fetches available auth providers from the config.
 */
const getAvailableProviders = (config: ResolvedLucidConfig) => {
	return {
		disablePassword: config.auth.password.enabled === false,
		magicLink: config.auth.magicLink.enabled,
		providers: config.auth.providers.filter((provider) => provider.enabled),
	};
};

export default getAvailableProviders;
