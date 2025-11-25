export const ADAPTER_KEY = "cloudflare";
export const LUCID_VERSION = "0.x.x";

export default {
	CONFIG_FILE: "lucid.config.js",
	ENTRY_FILE: "server",
	WORKER_EXPORT_ARTIFACT_TYPE: "worker-export",
	WORKER_ENTRY_ARTIFACT_TYPE: "worker-entry",
} as const;
