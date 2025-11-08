// plugin.ts
import { PLUGIN_KEY, LUCID_VERSION } from "./constants.js";
import type { LucidPluginOptions } from "@lucidcms/core/types";
import type { PluginOptions } from "./types/types.js";

const plugin: LucidPluginOptions<PluginOptions> = async (
	config,
	pluginOptions,
) => {
	const providers = config.auth.providers.find((p) => p.key === "microsoft");
	if (providers) {
		return {
			key: PLUGIN_KEY,
			lucid: LUCID_VERSION,
			config: config,
		};
	}

	const tenant = pluginOptions.tenant ?? "common";

	config.auth.providers.push({
		key: "microsoft",
		name: "Microsoft",
		// icon: "/public/microsoft-icon.svg",
		enabled: pluginOptions.enabled ?? true,
		type: "oidc",
		config: {
			type: "oidc",
			clientId: pluginOptions.clientId,
			clientSecret: pluginOptions.clientSecret,
			issuer: `https://login.microsoftonline.com/${tenant}/v2.0`,
			authorizationEndpoint: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
			tokenEndpoint: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
			userinfoEndpoint: "https://graph.microsoft.com/oidc/userinfo",
			scopes: ["openid", "profile", "email"],
		},
	});

	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		config: config,
	};
};

export default plugin;
