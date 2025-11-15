import { PLUGIN_KEY, LUCID_VERSION } from "./constants.js";
import type { LucidPlugin } from "@lucidcms/core/types";
import type { PluginOptions } from "./types/types.js";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	const currentDir = dirname(fileURLToPath(import.meta.url));

	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		recipe: (draft) => {
			const providers = draft.auth.providers.find((p) => p.key === "google");
			if (providers) {
				return;
			}

			draft.auth.providers.push({
				key: "google",
				name: "Google",
				icon: "/assets/auth-provider-icons/google-icon.svg",
				enabled: pluginOptions.enabled ?? true,
				type: "oidc" as const,
				config: {
					type: "oidc" as const,
					clientId: pluginOptions.clientId,
					clientSecret: pluginOptions.clientSecret,
					issuer: "https://accounts.google.com",
					authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
					tokenEndpoint: "https://oauth2.googleapis.com/token",
					userinfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
					scopes: ["openid", "profile"],
				},
			});

			draft.compilerOptions.paths.copyPublic.push({
				input: path.join(currentDir, "../assets/google-icon.svg"),
				output: "assets/auth-provider-icons/google-icon.svg",
			});
		},
	};
};

export default plugin;
