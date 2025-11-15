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
			const providers = draft.auth.providers.find((p) => p.key === "github");
			if (providers) {
				return;
			}

			draft.auth.providers.push({
				key: "github",
				name: "GitHub",
				icon: "/assets/auth-provider-icons/github-icon.svg",
				enabled: pluginOptions.enabled ?? true,
				type: "oidc" as const,
				config: {
					type: "oidc" as const,
					clientId: pluginOptions.clientId,
					clientSecret: pluginOptions.clientSecret,
					issuer: "https://github.com",
					authorizationEndpoint: "https://github.com/login/oauth/authorize",
					tokenEndpoint: "https://github.com/login/oauth/access_token",
					userinfoEndpoint: "https://api.github.com/user",
					scopes: ["read:user"],
				},
			});
			draft.compilerOptions.paths.copyPublic.push({
				input: path.join(currentDir, "../assets/github-icon.svg"),
				output: "assets/auth-provider-icons/github-icon.svg",
			});
		},
	};
};

export default plugin;
