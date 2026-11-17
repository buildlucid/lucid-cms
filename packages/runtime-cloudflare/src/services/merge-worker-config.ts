import type { WorkerConfig } from "@cloudflare/config";
import type { WorkerConfig as ParsedWorkerConfig } from "@cloudflare/vite-plugin";
import type { LucidWorkerConfig } from "./create-worker-config.js";

/**
 * Combines a Worker's own settings with Lucid's from `createWorkerConfig`. Lucid's settings win, which only
 * replaces bindings `--remote` connects, as Lucid leaves out everything else the Worker declares.
 */
const mergeWorkerConfig = <T extends WorkerConfig | ParsedWorkerConfig>(
	worker: T,
	lucid: LucidWorkerConfig,
): T => ({
	...worker,
	...lucid,
	compatibilityFlags: [
		...(lucid.compatibilityFlags ?? []),
		...(worker.compatibilityFlags ?? []),
	],
	env: { ...worker.env, ...lucid.env },
	exports: { ...worker.exports, ...lucid.exports },
	triggers: [...(lucid.triggers ?? []), ...(worker.triggers ?? [])],
});

export default mergeWorkerConfig;
