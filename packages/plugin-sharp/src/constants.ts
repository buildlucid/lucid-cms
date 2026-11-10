import packageJson from "../package.json" with { type: "json" };

export const PLUGIN_KEY = "@lucidcms/sharp";

export const PACKAGE_INFO = {
	name: packageJson.name,
	version: packageJson.version,
};
export const SUPPORTED_RUNTIME_ADAPTER_KEY = "node";
