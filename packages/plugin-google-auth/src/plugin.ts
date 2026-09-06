import { definePlugin } from "@lucidcms/core";
import type { LucidPlugin } from "@lucidcms/core/types";
import { LUCID_VERSION, PLUGIN_IDENTIFIER, PLUGIN_KEY } from "./constants.js";
import type { PluginOptions } from "./types/types.js";

/** Adds Google sign-in. An existing provider with the google key takes precedence. */
const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	return definePlugin({
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		sources: {
			public: [
				{
					input: new URL("../assets/google-icon.svg", import.meta.url),
					output: "lucid-plugins/google-auth/icon.svg",
				},
			],
		},
		configure: (draft) => {
			const providers = draft.auth.providers.find((p) => p.key === "google");
			if (providers) {
				return;
			}

			draft.auth.providers.push({
				key: PLUGIN_IDENTIFIER,
				name: "Google",
				icon: "/lucid-plugins/google-auth/icon.svg",
				enabled: pluginOptions.enabled ?? true,
				type: "oidc" as const,
				config: {
					type: "oidc" as const,
					clientId: pluginOptions.clientId,
					clientSecret: pluginOptions.clientSecret,
					issuer: "https://accounts.google.com",
					jwksEndpoint: "https://www.googleapis.com/oauth2/v3/certs",
					authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
					tokenEndpoint: "https://oauth2.googleapis.com/token",
					userinfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
					scopes: ["openid", "profile"],
				},
			});
		},
	});
};

export default plugin;
