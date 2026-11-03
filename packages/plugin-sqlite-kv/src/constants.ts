import packageJson from "../package.json" with { type: "json" };

export const PLUGIN_KEY = "@lucidcms/plugin-sqlite-kv";
export const LUCID_VERSION = "0.x.x";

export const PACKAGE_INFO = {
	name: packageJson.name,
	version: packageJson.version,
};
