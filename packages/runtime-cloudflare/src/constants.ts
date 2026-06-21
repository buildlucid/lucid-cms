export const ADAPTER_KEY = "cloudflare";
export const LUCID_VERSION = "0.x.x";
export const DEFAULT_KV_BINDING = "LUCID_KV";
export const DEFAULT_R2_BINDING = "LUCID_MEDIA_BUCKET";
export const DEFAULT_QUEUE_BINDING = "LUCID_QUEUE";

export default {
	CONFIG_FILE: "lucid.config.js",
	ENTRY_FILE: "server",
	WORKER_EXPORT_ARTIFACT_TYPE: "worker-export",
	WRANGLER_CONFIG_FILE: "wrangler.jsonc",
	WRANGLER_DEPLOY_CONFIG_FILE: ".wrangler/deploy/config.json",
	ASSETS_BINDING: "ASSETS",
	DEFAULT_CRONS: ["0 0 * * *", "0 */4 * * *"],
} as const;
