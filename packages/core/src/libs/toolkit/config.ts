import type { EnvironmentVariables } from "../../libs/runtime/types.js";
import type { Config } from "../../types/config.js";
import type { ServiceContext } from "../../utils/services/types.js";
import { passthroughKVAdapter } from "../kv/index.js";
import { passthroughQueueAdapter } from "../queue/index.js";
import type { CreateToolkitServiceContextOptions } from "./types.js";

const toolkitFallbackRequestUrl = "http://localhost:6543";

/**
 * Builds a toolkit-ready service context from resolved Lucid runtime values.
 */
export const createToolkitServiceContext = (
	options: CreateToolkitServiceContextOptions,
): ServiceContext => ({
	db: {
		client: options.config.db.client,
	},
	config: options.config,
	env: options.env ?? null,
	queue: options.queue ?? passthroughQueueAdapter(),
	kv: options.kv ?? passthroughKVAdapter(),
	request: {
		url:
			options.request?.url ??
			options.config.baseUrl ??
			toolkitFallbackRequestUrl,
		ipAddress: options.request?.ipAddress ?? null,
	},
});

export type { Config, EnvironmentVariables };
