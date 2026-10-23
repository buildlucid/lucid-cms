import type {
	CloudflareBindingsArtifact,
	CloudflareWorkerHandlerArtifact,
} from "./types.js";

export const ADAPTER_KEY = "cloudflare";
export const LUCID_VERSION = "0.x.x";
export const DEFAULT_KV_BINDING = "LUCID_KV";
export const DEFAULT_R2_BINDING = "LUCID_MEDIA_BUCKET";
export const DEFAULT_QUEUE_BINDING = "LUCID_QUEUE";
export const DEFAULT_IMAGES_BINDING = "LUCID_IMAGES";
/** Latest Cloudflare compatibility date validated against this runtime. */
export const DEFAULT_COMPATIBILITY_DATE = "2026-06-30";

export default {
	WORKER_HANDLER_ARTIFACT_TYPE:
		"cloudflare:worker-handler" satisfies CloudflareWorkerHandlerArtifact["type"],
	BINDINGS_ARTIFACT_TYPE:
		"cloudflare:bindings" satisfies CloudflareBindingsArtifact["type"],
	/** The project's Worker config, which the Cloudflare Vite plugin and Astro's adapter read. */
	CONFIG_FILE: "cloudflare.config.ts",
	ASSETS_BINDING: "ASSETS",
	JOB_SCHEDULER_CRON: "* * * * *",
	/** The Worker entry `withLucid` names, which Lucid's Astro integration serves. */
	ASTRO_WORKER_ENTRY: "virtual:lucid/astro-worker",
} as const;
