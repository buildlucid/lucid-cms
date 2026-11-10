import packageJson from "../package.json" with { type: "json" };

export const PLUGIN_KEY = "@lucidcms/cloudflare-kv";

export const PACKAGE_INFO = {
	name: packageJson.name,
	version: packageJson.version,
};
export const SUPPORTED_RUNTIME_ADAPTER_KEY = "cloudflare";
export const DEFAULT_KV_BINDING = "LUCID_KV";
