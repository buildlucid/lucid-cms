import z from "zod";
import { LucidError } from "../../../utils/errors/index.js";
import cliLogger from "../../cli/logger.js";
import assessMigrationPlans from "../../collection/migration/assess-migration-plan.js";
import planCollectionMigrations from "../../collection/plan-collection-migrations.js";
import collectSeeds from "../../seed/collect-seeds.js";
import createToolkit from "../../toolkit/create-toolkit.js";
import createTaskServiceContext from "./create-task-service-context.js";
import defineRuntimeTask from "./define-runtime-task.js";
import loadDevModules from "./load-dev-modules.js";
import runSyncTasks from "./run-sync-tasks.js";

/** Runs seeds on a migrated, synced CMS instance, isolating each seed in its own transaction so failures roll back partial writes. */
const seedTask = defineRuntimeTask({
	input: z.object({ names: z.array(z.string()).min(1) }),
	run: async (context, input) => {
		const { config } = context.host;
		const seeds = collectSeeds({
			definitions: config.seeds.definitions,
			modules: await loadDevModules(context.dev.seeds),
		});
		const selected = input.names.map((name) => {
			const seed = seeds[name];
			if (!seed) {
				throw new LucidError({
					message: `Unknown seed "${name}". Run "lucidcms seed:list" to see registered seeds.`,
				});
			}

			return { name, seed };
		});

		const database = await context.connect();
		cliLogger.info("Checking seed prerequisites");

		const migrationStatus = await config.db.getMigrationStatus(database.client);
		if (migrationStatus.missing.length > 0) {
			throw new LucidError({
				message: `Cannot run seeds because previously executed Lucid migrations are no longer registered: ${migrationStatus.missing.join(", ")}.`,
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

		const serviceContext = createTaskServiceContext(context, database);
		const collectionPlan = await planCollectionMigrations(serviceContext);
		if (collectionPlan.error) {
			throw new LucidError({
				message: `Could not check collection migrations before running seeds: ${serviceContext.translate.english(collectionPlan.error.message) || "Unknown error"}`,
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

		const synced = await runSyncTasks(serviceContext);
		if (!synced) {
			throw new LucidError({
				message: "Cannot run seeds because Lucid sync did not complete.",
			});
		}

		try {
			for (const { name, seed } of selected) {
				cliLogger.info(`Running seed "${name}"...`);
				await serviceContext.db.kysely.transaction().execute((transaction) => {
					const transactionContext = {
						...serviceContext,
						db: serviceContext.db.withTransaction(transaction),
					};

					return seed({
						context: transactionContext,
						toolkit: createToolkit(transactionContext),
					});
				});

				cliLogger.success(
					`Seed "${name}" completed`,
					cliLogger.color.green("successfully"),
				);
			}
		} finally {
			cliLogger.info("Clearing KV cache...");
			await serviceContext.kv.clear(serviceContext);
		}

		return { seeded: selected.length };
	},
});

export default seedTask;
