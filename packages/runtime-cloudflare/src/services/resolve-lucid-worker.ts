import type { WorkerConfig } from "@cloudflare/config";
import { LucidError } from "@lucidcms/core/runtime";
import { loadLucidProject } from "@lucidcms/core/vite";
import constants from "../constants.js";
import isCloudflareAdapter from "../utils/is-cloudflare-adapter.js";
import createWorkerConfig from "./create-worker-config.js";
import getWorkerSecrets from "./get-worker-secrets.js";

/** Loads the Lucid project and adds its required settings for `withLucid`, preserving the Worker's own settings. */
const resolveLucidWorker = async (
	worker: WorkerConfig,
	options?: { configPath?: string },
): Promise<WorkerConfig> => {
	const { project } = await loadLucidProject(options?.configPath);
	const { adapter } = project;
	if (!isCloudflareAdapter(adapter)) {
		throw new LucidError({
			message: "`withLucid` needs the Cloudflare runtime in lucid.config.*.",
		});
	}

	const lucid = createWorkerConfig({
		name: worker.name,
		compatibilityDate: worker.compatibilityDate,
		entrypoint: constants.ASTRO_WORKER_ENTRY,
		options: adapter.getOptions(),
		artifacts: project.artifacts.prepare,
		// Astro's adapter reads this file for its dev server and builds, which run under `NODE_ENV=production`.
		secrets: getWorkerSecrets(project, {
			deploy: process.env.NODE_ENV === "production",
		}),
		worker,
	});
	return {
		...worker,
		entrypoint: constants.ASTRO_WORKER_ENTRY,
		compatibilityFlags: [
			...(lucid.compatibilityFlags ?? []),
			...(worker.compatibilityFlags ?? []),
		],
		env: { ...lucid.env, ...worker.env },
		exports: { ...lucid.exports, ...worker.exports },
		triggers: [...(lucid.triggers ?? []), ...(worker.triggers ?? [])],
	};
};

export default resolveLucidWorker;
