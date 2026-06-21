import constants from "../../constants/constants.js";
import type { EnvironmentVariables } from "../../libs/runtime/types.js";
import type { Config } from "../../types/config.js";
import type { ServiceContext } from "../../utils/services/types.js";
import { passthroughEmailAdapterInstance } from "../email/adapters/passthrough.js";
import { createTranslator } from "../i18n/index.js";
import type { TranslationStore } from "../i18n/types.js";
import { passthroughKVAdapter } from "../kv/index.js";
import { passthroughQueueAdapter } from "../queue/index.js";
import type { CreateToolkitServiceContextOptions } from "./types.js";

/**
 * Builds a toolkit-ready service context from resolved Lucid runtime values.
 */
export const createToolkitServiceContext = (
	options: CreateToolkitServiceContextOptions,
): ServiceContext => {
	const locale = "en";
	const db = {
		client: options.config.db.client,
	};
	const request = {
		url:
			options.request?.url ?? options.config.host ?? constants.urls.localhost,
		ipAddress: options.request?.ipAddress ?? null,
		locale,
		tenantKey: options.request?.tenantKey ?? null,
	};
	return {
		db,
		config: options.config,
		env: options.env ?? null,
		runtimeContext: options.runtimeContext,
		queue: options.queue ?? passthroughQueueAdapter(),
		kv: options.kv ?? passthroughKVAdapter(),
		media: options.media ?? null,
		email: options.email ?? passthroughEmailAdapterInstance,
		translate: createTranslator({ store: options.translationStore, locale }),
		request,
	};
};

export type { Config, EnvironmentVariables, TranslationStore };
