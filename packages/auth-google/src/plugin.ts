// plugin.ts
import { PLUGIN_KEY, LUCID_VERSION } from "./constants.js";
import type { LucidPluginOptions } from "@lucidcms/core/types";
import type { PluginOptions } from "./types/types.js";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const plugin: LucidPluginOptions<PluginOptions> = async (
	config,
	pluginOptions,
) => {
	const providers = config.auth.providers.find((p) => p.key === "google");
	if (providers) {
		return {
			key: PLUGIN_KEY,
			lucid: LUCID_VERSION,
			config: config,
		};
	}

	config.auth.providers.push({
		key: "google",
		name: "Google",
		icon: "/assets/auth-provider-icons/google-icon.svg",
		enabled: pluginOptions.enabled ?? true,
		type: "oidc",
		config: {
			type: "oidc",
			clientId: pluginOptions.clientId,
			clientSecret: pluginOptions.clientSecret,
			issuer: "https://accounts.google.com",
			authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
			tokenEndpoint: "https://oauth2.googleapis.com/token",
			userinfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
			scopes: ["openid", "profile", "email"],
		},
	});

	const currentDir = dirname(fileURLToPath(import.meta.url));

	config.compilerOptions.paths.copyPublic.push({
		input: path.join(currentDir, "../assets/google-icon.svg"),
		output: "assets/auth-provider-icons/google-icon.svg",
	});

	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		config: config,
	};
};

export default plugin;
