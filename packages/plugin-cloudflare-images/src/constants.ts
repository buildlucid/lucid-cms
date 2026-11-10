import packageJson from "../package.json" with { type: "json" };

export const PLUGIN_KEY = "@lucidcms/cloudflare-images";
export const PROCESSOR_KEY = "cloudflare-images";

export const PACKAGE_INFO = {
	name: packageJson.name,
	version: packageJson.version,
};
export const SUPPORTED_RUNTIME_ADAPTER_KEY = "cloudflare";
export const DEFAULT_IMAGES_BINDING = "LUCID_IMAGES";
export const MAX_INPUT_BYTES = 20 * 1024 * 1024;
export const MAX_SOURCE_PIXELS = 100_000_000;
export const MAX_JPEG_PNG_DIMENSION = 12_000;
