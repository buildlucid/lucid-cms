import packageJson from "../package.json" with { type: "json" };

export const PLUGIN_KEY = "@lucidcms/github-auth";

export const PACKAGE_INFO = {
	name: packageJson.name,
	version: packageJson.version,
};
export const PLUGIN_IDENTIFIER = "github";
