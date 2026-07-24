import { syncServices } from "../../../services/index.js";
import type { Config, EnvironmentVariables } from "../../../types.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { DatabaseConnection } from "../../db/types.js";
import { passthroughEmailAdapterInstance } from "../../email/adapters/passthrough.js";
import type { TranslationStore } from "../../i18n/types.js";
import {
	destroyKVAdapter,
	getInitializedKVAdapter,
} from "../../kv/lifecycle.js";
import type { KVAdapterInstance } from "../../kv/types.js";
import passthroughQueueAdapter from "../../queue/adapters/passthrough.js";
import type { AdapterRuntimeContext } from "../../runtime/types.js";
import cliLogger from "../logger.js";

const runSyncTasks = async (options: {
	config: Config;
	database: DatabaseConnection;
	translationStore: TranslationStore;
	kv?: KVAdapterInstance;
	env?: EnvironmentVariables;
	runtimeContext?: AdapterRuntimeContext;
}): Promise<boolean> => {
	cliLogger.info("Running sync tasks...");

	const kv =
		options.kv ??
		(await getInitializedKVAdapter(options.config, {
			env: options.env,
			runtimeContext: options.runtimeContext,
		}));
	const shouldDestroyKV = options.kv === undefined;

	const context = createServiceContext({
		config: options.config,
		database: options.database,
		translationStore: options.translationStore,
		env: options.env,
		runtimeContext: options.runtimeContext,
		queue: passthroughQueueAdapter(),
		kv,
		media: null,
		email: passthroughEmailAdapterInstance,
	});

	let cleanedUp = false;
	const cleanupAdapters = async () => {
		if (cleanedUp) return;
		cleanedUp = true;
		if (shouldDestroyKV) {
			await destroyKVAdapter(kv, {
				config: options.config,
				env: options.env,
				runtimeContext: options.runtimeContext,
			});
		}
	};

	try {
		const [localesResult, tenantsResult, collectionsResult, rolesResult] =
			await Promise.all([
				syncServices.syncLocales(context),
				syncServices.syncTenants(context),
				syncServices.syncCollections(context),
				syncServices.syncRoles(context),
			]);

		for (const [label, result] of [
			["locale", localesResult],
			["tenants", tenantsResult],
			["collection", collectionsResult],
			["roles", rolesResult],
		] as const) {
			if (!result.error) continue;
			cliLogger.error(
				`Sync failed during ${label} sync, with error:`,
				context.translate.english(result.error.message) || "unknown",
			);
			return false;
		}

		cliLogger.success(
			"Sync tasks completed",
			cliLogger.color.green("successfully"),
		);
		return true;
	} finally {
		await cleanupAdapters();
	}
};

export default runSyncTasks;
