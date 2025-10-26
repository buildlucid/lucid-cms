import type { Config } from "../../types.js";

/**
 * Fetches available auth providers from the config.
 */
const getAvailableProviders = (config: Config) => {
	return {
		disablePassword: config.auth.password.enabled === false,
		providers: config.auth.providers.filter((provider) => provider.enabled),
	};
};

export default getAvailableProviders;
