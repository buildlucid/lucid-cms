import type { EnvironmentVariables } from "../../libs/runtime/types.js";
import type { Config } from "../../types/config.js";
import type { ServiceContext } from "../../utils/services/types.js";
import { createTranslator } from "../i18n/index.js";
import type { TranslationStore } from "../i18n/types.js";
import { passthroughKVAdapter } from "../kv/index.js";
import { passthroughQueueAdapter } from "../queue/index.js";
import type { CreateToolkitServiceContextOptions } from "./types.js";

const toolkitFallbackRequestUrl = "http://localhost:6543";

/**
 * Builds a toolkit-ready service context from resolved Lucid runtime values.
 */
export const createToolkitServiceContext = (
	options: CreateToolkitServiceContextOptions,
): ServiceContext => {
	const locale = "en";

	return {
		db: {
			client: options.config.db.client,
		},
		config: options.config,
		env: options.env ?? null,
		queue: options.queue ?? passthroughQueueAdapter(),
		kv: options.kv ?? passthroughKVAdapter(),
		translate: createTranslator({ store: options.translationStore, locale }),
		request: {
			url:
				options.request?.url ??
				options.config.baseUrl ??
				toolkitFallbackRequestUrl,
			ipAddress: options.request?.ipAddress ?? null,
			locale,
			tenantKey: options.request?.tenantKey ?? null,
		},
	};
};

export type { Config, EnvironmentVariables, TranslationStore };
