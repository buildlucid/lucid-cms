import packageJson from "../package.json" with { type: "json" };

export const PLUGIN_KEY = "@lucidcms/plugin-github-auth";
export const LUCID_VERSION = "0.x.x";

export const PACKAGE_INFO = {
	name: packageJson.name,
	version: packageJson.version,
};
export const PLUGIN_IDENTIFIER = "github";
