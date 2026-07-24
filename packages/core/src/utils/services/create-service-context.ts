import constants from "../../constants/constants.js";
import { passthroughEmailAdapterInstance } from "../../libs/email/adapters/passthrough.js";
import { createTranslator } from "../../libs/i18n/index.js";
import { passthroughKVAdapter } from "../../libs/kv/index.js";
import { passthroughQueueAdapter } from "../../libs/queue/index.js";
import type { CreateServiceContextOptions, ServiceContext } from "./types.js";

/**
 * Internal helper for building service contexts outside the HTTP request pipeline.
 * HTTP service contexts resolve request metadata and locale from the Hono context.
 */
const createServiceContext = (
	options: CreateServiceContextOptions,
): ServiceContext => {
	const locale = options.config.i18n.defaultLocale;

	return {
		db: {
			client: options.database.client,
		},
		config: options.config,
		env: options.env ?? null,
		runtimeContext: options.runtimeContext,
		queue: options.queue ?? passthroughQueueAdapter(),
		kv: options.kv ?? passthroughKVAdapter(),
		media: options.media ?? null,
		email: options.email ?? passthroughEmailAdapterInstance,
		translate: createTranslator({
			store: options.translationStore,
			locale,
		}),
		request: {
			url:
				options.request?.url ?? options.config.host ?? constants.urls.localhost,
			ipAddress: options.request?.ipAddress ?? null,
			locale,
			tenantKey: options.request?.tenantKey ?? null,
		},
	};
};

export default createServiceContext;
