import constants from "../../../constants/constants.js";
import { syncServices } from "../../../services/index.js";
import type { Config, EnvironmentVariables } from "../../../types.js";
import { passthroughEmailAdapterInstance } from "../../email/adapters/passthrough.js";
import { createTranslator } from "../../i18n/index.js";
import type { TranslationStore } from "../../i18n/types.js";
import {
	destroyKVAdapter,
	getInitializedKVAdapter,
} from "../../kv/lifecycle.js";
import type { KVAdapterInstance } from "../../kv/types.js";
import { stopLoggerBuffering } from "../../logger/index.js";
import passthroughQueueAdapter from "../../queue/adapters/passthrough.js";
import type { AdapterRuntimeContext } from "../../runtime/types.js";
import cliLogger from "../logger.js";

const runSyncTasks = async (
	config: Config,
	translationStore: TranslationStore,
	mode: "process" | "return",
	kvInstance?: KVAdapterInstance,
	env?: EnvironmentVariables,
	runtimeContext?: AdapterRuntimeContext,
): Promise<boolean> => {
	cliLogger.info("Running sync tasks...");

	const kv =
		kvInstance ??
		(await getInitializedKVAdapter(config, { env, runtimeContext }));
	const shouldDestroyKV = kvInstance === undefined;
	const media = null;
	const email = passthroughEmailAdapterInstance;
	const queue = passthroughQueueAdapter();
	const translate = createTranslator({ store: translationStore, locale: "en" });
	let cleanedUp = false;
	const cleanupAdapters = async () => {
		if (cleanedUp) return;
		cleanedUp = true;
		await Promise.allSettled([
			shouldDestroyKV
				? destroyKVAdapter(kv, { config, env, runtimeContext })
				: Promise.resolve(),
		]);
	};

	try {
		const [localesResult, tenantsResult, collectionsResult, rolesResult] =
			await Promise.all([
				syncServices.syncLocales({
					db: { client: config.db.client },
					config: config,
					queue: queue,
					env: env ?? null,
					runtimeContext,
					kv: kv,
					media,
					email,
					translate,
					request: {
						url: config.host ?? constants.urls.localhost,
						locale: "en",
					},
				}),
				syncServices.syncTenants({
					db: { client: config.db.client },
					config: config,
					queue: queue,
					env: env ?? null,
					runtimeContext,
					kv: kv,
					media,
					email,
					translate,
					request: {
						url: config.host ?? constants.urls.localhost,
						locale: "en",
					},
				}),
				syncServices.syncCollections({
					db: { client: config.db.client },
					config: config,
					queue: queue,
					env: env ?? null,
					runtimeContext,
					kv: kv,
					media,
					email,
					translate,
					request: {
						url: config.host ?? constants.urls.localhost,
						locale: "en",
					},
				}),
				syncServices.syncRoles({
					db: { client: config.db.client },
					config: config,
					queue: queue,
					env: env ?? null,
					runtimeContext,
					kv: kv,
					media,
					email,
					translate,
					request: {
						url: config.host ?? constants.urls.localhost,
						locale: "en",
					},
				}),
			]);

		if (localesResult.error) {
			cliLogger.error(
				"Sync failed during locale sync, with error:",
				translate.english(localesResult.error.message) || "unknown",
			);
			if (mode === "process") {
				await cleanupAdapters();
				await stopLoggerBuffering();
				process.exit(1);
			} else return false;
		}
		if (tenantsResult.error) {
			cliLogger.error(
				"Sync failed during tenants sync, with error:",
				translate.english(tenantsResult.error.message) || "unknown",
			);
			if (mode === "process") {
				await cleanupAdapters();
				await stopLoggerBuffering();
				process.exit(1);
			} else return false;
		}
		if (collectionsResult.error) {
			cliLogger.error(
				"Sync failed during collections sync, with error:",
				translate.english(collectionsResult.error.message) || "unknown",
			);
			if (mode === "process") {
				await cleanupAdapters();
				await stopLoggerBuffering();
				process.exit(1);
			} else return false;
		}
		if (rolesResult.error) {
			cliLogger.error(
				"Sync failed during roles sync, with error:",
				translate.english(rolesResult.error.message) || "unknown",
			);
			if (mode === "process") {
				await cleanupAdapters();
				await stopLoggerBuffering();
				process.exit(1);
			} else return false;
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
