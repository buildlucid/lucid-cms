import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { LucidPlugin } from "@lucidcms/core/types";
import { LUCID_VERSION, PLUGIN_KEY } from "./constants.js";
import type { PluginOptions } from "./types/types.js";

const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	const currentDir = dirname(fileURLToPath(import.meta.url));
	const tenant = pluginOptions.tenant ?? "organizations";

	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		recipe: (draft) => {
			const providers = draft.auth.providers.find((p) => p.key === "microsoft");
			if (providers) {
				return;
			}

			draft.auth.providers.push({
				key: "microsoft",
				name: "Microsoft",
				icon: "/lucid/assets/auth-provider-icons/microsoft-icon.svg",
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

			draft.build.paths.copyPublic.push({
				input: path.join(currentDir, "../assets/microsoft-icon.svg"),
				output: "lucid/assets/auth-provider-icons/microsoft-icon.svg",
			});
		},
	};
};

export default plugin;
