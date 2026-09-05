import type { LucidPlugin } from "@lucidcms/core/types";
import { LUCID_VERSION, PLUGIN_IDENTIFIER, PLUGIN_KEY } from "./constants.js";
import type { PluginOptions } from "./types/types.js";

const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		sources: {
			public: [
				{
					input: new URL("../assets/github-icon.svg", import.meta.url),
					output: "lucid-plugins/github-auth/icon.svg",
				},
			],
		},
		recipe: (draft) => {
			const providers = draft.auth.providers.find((p) => p.key === "github");
			if (providers) {
				return;
			}

			draft.auth.providers.push({
				key: PLUGIN_IDENTIFIER,
				name: "GitHub",
				icon: "/lucid-plugins/github-auth/icon.svg",
				enabled: pluginOptions.enabled ?? true,
				type: "oauth2" as const,
				config: {
					type: "oauth2" as const,
					clientId: pluginOptions.clientId,
					clientSecret: pluginOptions.clientSecret,
					authorizationEndpoint: "https://github.com/login/oauth/authorize",
					tokenEndpoint: "https://github.com/login/oauth/access_token",
					userinfoEndpoint: "https://api.github.com/user",
					scopes: ["read:user"],
				},
			});
		},
	};
};

export default plugin;
