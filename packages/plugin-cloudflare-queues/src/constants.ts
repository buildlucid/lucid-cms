import packageJson from "../package.json" with { type: "json" };

export const PLUGIN_KEY = "@lucidcms/cloudflare-queues";

export const PACKAGE_INFO = {
	name: packageJson.name,
	version: packageJson.version,
};
export const ADAPTER_KEY = "cloudflare-queues";
export const SUPPORTED_RUNTIME_ADAPTER_KEY = "cloudflare";
export const DEFAULT_QUEUE_BINDING = "LUCID_QUEUE";
export const MAX_DELAY_MS = 12 * 60 * 60 * 1_000;
export const MAX_BATCH_SIZE = 100;
