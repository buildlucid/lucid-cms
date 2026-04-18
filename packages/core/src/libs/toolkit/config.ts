import { LucidError } from "../../utils/errors/index.js";
import type { ServiceContext } from "../../utils/services/types.js";
import loadConfigFile from "../config/load-config-file.js";
import { passthroughKVAdapter } from "../kv-adapter/index.js";
import { passthroughQueueAdapter } from "../queue-adapter/index.js";
import type { CreateToolkitOptions } from "./types.js";

const toolkitFallbackRequestUrl = "http://localhost:6543";

/**
 * Builds a service context for toolkit calls that run outside the request lifecycle.
 * This is the only toolkit step that may throw because it loads config and prepares
 * the shared service dependencies used by toolkit calls.
 */
export const createToolkitServiceContext = async (
	options?: CreateToolkitOptions,
): Promise<ServiceContext> => {
	try {
		const loadedConfig = await loadConfigFile({
			silent: true,
		});
		const requestUrl =
			options?.requestUrl ??
			loadedConfig.config.baseUrl ??
			toolkitFallbackRequestUrl;

		return {
			db: {
				client: loadedConfig.config.db.client,
			},
			config: loadedConfig.config,
			env: loadedConfig.env ?? null,
			queue: passthroughQueueAdapter(),
			kv: passthroughKVAdapter(),
			requestUrl,
		};
	} catch (error) {
		if (error instanceof LucidError) throw error;

		throw new LucidError({
			message:
				error instanceof Error
					? error.message
					: "Lucid toolkit could not create a service context.",
			scope: "toolkit",
		});
	}
};
