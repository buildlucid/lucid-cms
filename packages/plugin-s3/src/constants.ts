import packageJson from "../package.json" with { type: "json" };

export const PLUGIN_KEY = "@lucidcms/plugin-s3";
export const LUCID_VERSION = "0.x.x";

export const PACKAGE_INFO = {
	name: packageJson.name,
	version: packageJson.version,
};

export const PRESIGNED_URL_EXPIRY = 3600; // 1 hour
export const DEFAULT_PART_SIZE = 8 * 1024 * 1024; // 8 MiB
