import { select } from "@inquirer/prompts";
import type {
	Config,
	EnvironmentVariables,
	ServiceContext,
} from "../../../types.js";
import { LucidError } from "../../../utils/errors/index.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import assessMigrationPlans from "../../collection/migration/assess-migration-plan.js";
import planCollectionMigrations from "../../collection/plan-collection-migrations.js";
import loadConfigFile from "../../config/load-config-file.js";
import { prepareExternalMigrations } from "../../db/load-external-migrations.js";
import type { DatabaseConnection } from "../../db/types.js";
import prepareTranslations from "../../i18n/prepare-translations.js";
import type { TranslationStore } from "../../i18n/types.js";
import {
	destroyKVAdapter,
	getInitializedKVAdapter,
} from "../../kv/lifecycle.js";
import type { KVAdapterInstance } from "../../kv/types.js";
import {
	startLoggerBuffering,
	stopLoggerBuffering,
} from "../../logger/index.js";
import type { AdapterRuntimeContext } from "../../runtime/types.js";
import { prepareSeeds } from "../../seed/load-seeds.js";
import type { Seed } from "../../seed/types.js";
import cliLogger from "../logger.js";
import runSyncTasks from "../services/run-sync-tasks.js";
import validateEnvVars from "../services/validate-env-vars.js";

/** Loads seed definitions using the same resolved config root as migrations. */
const loadConfiguredSeeds = async () => {
	const result = await loadConfigFile({ prepareRuntime: true });
	return {
		...result,
		seeds: await prepareSeeds(result.config, result.projectRoot),
	};
};

/** Lists every project and plugin seed without opening a database connection. */
export const seedListCommand = async (_options?: { remote?: boolean }) => {
	try {
		startLoggerBuffering();
		const { seeds } = await loadConfiguredSeeds();
		const names = Object.keys(seeds).sort();

		if (names.length === 0) {
			cliLogger.info("No seeds are registered");
		} else {
			cliLogger.info(`Found ${names.length} registered seed(s)`);
			for (const name of names) {
				cliLogger.log(cliLogger.color.cyan(name), {
					indent: 2,
					symbol: "child",
				});
			}
		}

		await stopLoggerBuffering();
		process.exit(0);
	} catch (error) {
		if (error instanceof Error) {
			cliLogger.errorInstance(error, "Failed to list seeds");
		} else {
			cliLogger.error("Failed to list seeds", "Unknown error");
		}
		await stopLoggerBuffering();
		process.exit(1);
	}
};

/**
 * Runs selected seeds against a fully migrated and synchronized CMS instance.
 * Each seed gets its own transaction where supported so one failing seed does
 * not leave partial writes from that seed behind.
 */
const seedCommand = async (
	seedName?: string,
	options?: { all?: boolean; remote?: boolean },
) => {
	let config: Config | undefined;
	let env: EnvironmentVariables | undefined;
	let runtimeContext: AdapterRuntimeContext | undefined;
	let translationStore: TranslationStore | undefined;
	let database: DatabaseConnection | undefined;
	let kv: KVAdapterInstance | undefined;
	let serviceContext: ServiceContext | undefined;

	const cleanupAdapters = async () => {
		if (!config) return;
		await Promise.allSettled([
			database?.destroy(),
			destroyKVAdapter(kv, { config, env, runtimeContext }),
		]);
		database = undefined;
		kv = undefined;
	};

	try {
		startLoggerBuffering();
		const startTime = cliLogger.startTimer();
		const result = await loadConfiguredSeeds();
		config = result.config;
		env = result.env;
		runtimeContext = result.runtimeContext;
		const seeds = result.seeds;
		const seedNames = Object.keys(seeds).sort();

		translationStore = (
			await prepareTranslations({
				config,
				projectRoot: result.projectRoot,
			})
		).translationStore;

		const envValid = await validateEnvVars({
			envSchema: result.envSchema,
			env,
		});
		if (!envValid) {
			await cleanupAdapters();
			await stopLoggerBuffering();
			process.exit(1);
		}

		if (seedName && options?.all) {
			throw new LucidError({
				message: "Specify either a seed name or --all, not both.",
			});
		}
		if (seedNames.length === 0) {
			cliLogger.info("No seeds are registered");
			await cleanupAdapters();
			await stopLoggerBuffering();
			process.exit(0);
		}

		let selectedNames: string[];
		if (options?.all) {
			selectedNames = seedNames;
		} else if (seedName) {
			if (!seeds[seedName]) {
				throw new LucidError({
					message: `Unknown seed "${seedName}". Run "lucidcms seed:list" to see registered seeds.`,
				});
			}
			selectedNames = [seedName];
		} else {
			try {
				selectedNames = [
					await select<string>({
						message: "Select a seed to run:",
						choices: seedNames.map((name) => ({ name, value: name })),
					}),
				];
			} catch (error) {
				if (error instanceof Error && error.name === "ExitPromptError") {
					await cleanupAdapters();
					await stopLoggerBuffering();
					process.exit(0);
				}
				throw error;
			}
		}

		await prepareExternalMigrations(config, result.projectRoot);
		database = await config.db.connect(env);
		cliLogger.info("Checking seed prerequisites");

		const migrationStatus = await config.db.getMigrationStatus(database.client);
		if (migrationStatus.missing.length > 0) {
			throw new LucidError({
				message: `Cannot run seeds because previously executed migrations are no longer registered: ${migrationStatus.missing.join(", ")}.`,
			});
		}
		if (
			migrationStatus.pendingCore.length > 0 ||
			migrationStatus.pendingExternal.length > 0
		) {
			throw new LucidError({
				message:
					'Cannot run seeds while database migrations are pending. Run "lucidcms migrate" first.',
			});
		}

		const preflightContext = createServiceContext({
			config,
			database,
			translationStore,
			env,
			runtimeContext,
		});
		const collectionPlan = await planCollectionMigrations(preflightContext);
		if (collectionPlan.error) {
			throw new LucidError({
				message: `Could not check collection migrations before running seeds: ${preflightContext.translate.english(collectionPlan.error.message) || "Unknown error"}`,
			});
		}
		if (
			assessMigrationPlans(
				collectionPlan.data.collections.map(
					({ migrationPlan }) => migrationPlan,
				),
			).reasons.length > 0
		) {
			throw new LucidError({
				message:
					'Cannot run seeds while collection migrations are pending. Run "lucidcms migrate" first.',
			});
		}

		kv = await getInitializedKVAdapter(config, { env, runtimeContext });
		const synced = await runSyncTasks({
			config,
			database,
			translationStore,
			kv,
			env,
			runtimeContext,
		});
		if (!synced) {
			throw new LucidError({
				message: "Cannot run seeds because Lucid sync did not complete.",
			});
		}

		const seedContext: ServiceContext = { ...preflightContext, kv };
		serviceContext = seedContext;

		for (const name of selectedNames) {
			const seed = seeds[name] as Seed;
			cliLogger.info(`Running seed "${name}"...`);
			if (config.db.supports("transaction")) {
				await seedContext.db.kysely.transaction().execute((transaction) =>
					seed({
						...seedContext,
						db: seedContext.db.withTransaction(transaction),
					}),
				);
			} else {
				await seed(seedContext);
			}
			cliLogger.success(
				`Seed "${name}" completed`,
				cliLogger.color.green("successfully"),
			);
		}

		cliLogger.info("Clearing KV cache...");
		await kv.clear(seedContext);
		const endTime = startTime();
		await cleanupAdapters();

		cliLogger.log(
			cliLogger.createBadge("LUCID CMS"),
			`${selectedNames.length} seed(s) completed`,
			cliLogger.color.green("successfully"),
			"in",
			cliLogger.color.green(cliLogger.formatMilliseconds(endTime)),
			{ spaceAfter: true, spaceBefore: true },
		);
		await stopLoggerBuffering();
		process.exit(0);
	} catch (error) {
		if (kv && serviceContext) {
			await Promise.allSettled([kv.clear(serviceContext)]);
		}
		await cleanupAdapters();
		if (error instanceof Error) {
			cliLogger.errorInstance(error, "Seed failed");
		} else {
			cliLogger.error("Seed failed", "Unknown error");
		}
		await stopLoggerBuffering();
		process.exit(1);
	}
};

export default seedCommand;
