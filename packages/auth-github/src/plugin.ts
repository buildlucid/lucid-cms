import { PLUGIN_KEY, LUCID_VERSION } from "./constants.js";
import type { LucidPluginOptions } from "@lucidcms/core/types";
import type { PluginOptions } from "./types/types.js";

const plugin: LucidPluginOptions<PluginOptions> = async (
	config,
	pluginOptions,
) => {
	const providers = config.auth.providers.find((p) => p.key === "github");
	if (providers) {
		return {
			key: PLUGIN_KEY,
			lucid: LUCID_VERSION,
			config: config,
		};
	}

	config.auth.providers.push({
		key: "github",
		name: "GitHub",
		// icon: "/public/github-icon.svg",
		enabled: pluginOptions.enabled ?? true,
		type: "oidc",
		config: {
			type: "oidc",
			clientId: pluginOptions.clientId,
			clientSecret: pluginOptions.clientSecret,
			issuer: "https://github.com",
			authorizationEndpoint: "https://github.com/login/oauth/authorize",
			tokenEndpoint: "https://github.com/login/oauth/access_token",
			userinfoEndpoint: "https://api.github.com/user",
			scopes: ["read:user", "user:email"],
		},
	});

	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		config: config,
	};
};

export default plugin;
