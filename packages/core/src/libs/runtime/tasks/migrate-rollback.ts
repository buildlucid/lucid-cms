import z from "zod";
import constants from "../../../constants/constants.js";
import { LucidError } from "../../../utils/errors/index.js";
import cliLogger from "../../cli/logger.js";
import logger from "../../logger/index.js";
import createTaskServiceContext from "./create-task-service-context.js";
import defineRuntimeTask from "./define-runtime-task.js";

/** Plans rollback of the latest migrations and runs it only when `migrations` matches the returned plan approved by the command. */
const migrateRollbackTask = defineRuntimeTask({
	input: z.object({
		steps: z.number().int().positive(),
		migrations: z.array(z.string()).optional(),
	}),
	run: async (context, input) => {
		const { config } = context.host;
		const database = await context.connect();

		//* missing Lucid migrations would fail the rollback midway, so surface them upfront
		const status = await config.db.getMigrationStatus(database.client);
		if (status.missing.length > 0) {
			return { status: "missing", migrations: status.missing } as const;
		}
		if (status.executed.length === 0) return { status: "none" } as const;

		//* rollbacks happen in execution order, which can diverge from name order with external migrations
		const executed = (
			await (await config.db.createMigrator(database)).getMigrations()
		)
			.filter((migration) => migration.executedAt !== undefined)
			.sort((a, b) => {
				const aTime = a.executedAt?.getTime() ?? 0;
				const bTime = b.executedAt?.getTime() ?? 0;
				if (aTime === bTime) return a.name.localeCompare(b.name);
				return aTime - bTime;
			});

		const planned: string[] = [];
		for (const migration of executed.slice(-input.steps).reverse()) {
			if (config.db.protectedMigrations.includes(migration.name)) {
				return { status: "protected", migration: migration.name } as const;
			}

			//* retired migrations have nothing to undo, and removing them would rerun them if their plugin comes back
			if (status.retired.includes(migration.name)) {
				return { status: "retired", migration: migration.name } as const;
			}

			planned.push(migration.name);
		}

		const confirmed =
			input.migrations?.length === planned.length &&
			planned.every((name, index) => input.migrations?.[index] === name);
		if (!confirmed) {
			return {
				status: "confirm",
				executed: executed.length,
				migrations: planned,
			} as const;
		}

		cliLogger.info(`Rolling back ${planned.length} migration(s)...`);
		const serviceContext = createTaskServiceContext(context, database);
		const migrator = await config.db.createMigrator(database, serviceContext);

		let rolledBack = 0;
		for (let i = 0; i < planned.length; i++) {
			const { error, results } = await migrator.migrateDown();

			for (const result of results ?? []) {
				if (result.status === "Success") {
					logger.debug({
						message: `Rolled back "${result.migrationName}" successfully`,
						scope: constants.logScopes.migrations,
					});
					rolledBack++;
				} else if (result.status === "Error") {
					logger.error({
						message: `Failed to rollback migration "${result.migrationName}"`,
						scope: constants.logScopes.migrations,
					});
				}
			}

			if (error) {
				throw error instanceof Error
					? error
					: new LucidError({ message: "The rollback failed." });
			}
		}

		if (rolledBack === 0) {
			cliLogger.warn("No migrations were rolled back");
		} else {
			cliLogger.success(
				`Rolled back ${rolledBack} migration(s)`,
				cliLogger.color.green("successfully"),
			);
		}

		cliLogger.info("Clearing KV cache...");
		await serviceContext.kv.clear(serviceContext);

		return { status: "complete" } as const;
	},
});

export default migrateRollbackTask;
