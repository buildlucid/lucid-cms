import packageJson from "../package.json" with { type: "json" };

export const PLUGIN_KEY = "@lucidcms/redis";

export const PACKAGE_INFO = {
	name: packageJson.name,
	version: packageJson.version,
};
