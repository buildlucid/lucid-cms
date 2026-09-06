import { definePlugin } from "@lucidcms/core";
import type { LucidPlugin } from "@lucidcms/core/types";
import { LUCID_VERSION, PLUGIN_IDENTIFIER, PLUGIN_KEY } from "./constants.js";
import type { PluginOptions } from "./types/types.js";

/** Adds Microsoft sign-in. An existing provider with the microsoft key takes precedence. */
const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	const tenant = pluginOptions.tenant ?? "organizations";

	return definePlugin({
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		sources: {
			public: [
				{
					input: new URL("../assets/microsoft-icon.svg", import.meta.url),
					output: "lucid-plugins/microsoft-auth/icon.svg",
				},
			],
		},
		configure: (draft) => {
			const providers = draft.auth.providers.find((p) => p.key === "microsoft");
			if (providers) {
				return;
			}

			draft.auth.providers.push({
				key: PLUGIN_IDENTIFIER,
				name: "Microsoft",
				icon: "/lucid-plugins/microsoft-auth/icon.svg",
				enabled: pluginOptions.enabled ?? true,
				type: "oidc" as const,
				config: {
					type: "oidc" as const,
					clientId: pluginOptions.clientId,
					clientSecret: pluginOptions.clientSecret,
					issuer: `https://login.microsoftonline.com/${tenant}/v2.0`,
					authorizationEndpoint: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
					tokenEndpoint: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
					userinfoEndpoint: "https://graph.microsoft.com/oidc/userinfo",
					scopes: ["openid", "profile"],
				},
			});
		},
	});
};

export default plugin;
