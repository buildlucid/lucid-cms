import z from "zod";
import assessMigrationPlans from "../../collection/migration/assess-migration-plan.js";
import planCollectionMigrations from "../../collection/plan-collection-migrations.js";
import createTaskServiceContext from "./create-task-service-context.js";
import defineRuntimeTask from "./define-runtime-task.js";

/** Reports what `migrate` would do and whether the migration history is healthy, without changing anything. */
const migrateStatusTask = defineRuntimeTask({
	input: z.object({}),
	run: async (context) => {
		const database = await context.connect();
		const status = await context.host.config.db.getMigrationStatus(
			database.client,
		);

		const serviceContext = createTaskServiceContext(context, database);
		const collectionPlan = await planCollectionMigrations(serviceContext);

		return {
			executed: status.executed.length,
			pending: [...status.pendingCore, ...status.pendingExternal],
			missing: status.missing,
			retired: status.retired,
			collections: collectionPlan.error
				? {
						error:
							serviceContext.translate.english(collectionPlan.error.message) ||
							"Unknown error",
					}
				: {
						pending: collectionPlan.data.collections
							.map(({ migrationPlan }) => ({
								collectionKey: migrationPlan.collectionKey,
								assessment: assessMigrationPlans([migrationPlan]),
							}))
							.filter(({ assessment }) => assessment.reasons.length > 0),
					},
		};
	},
});

export default migrateStatusTask;
