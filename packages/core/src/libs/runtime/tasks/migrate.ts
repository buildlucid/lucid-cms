import z from "zod";
import createTaskServiceContext from "./create-task-service-context.js";
import defineRuntimeTask from "./define-runtime-task.js";
import runMigrations from "./run-migrations.js";

/** Runs database and collection migrations, returning unapproved gates for the command to confirm. */
const migrateTask = defineRuntimeTask({
	input: z.object({
		yes: z.boolean().optional(),
		allowDestructive: z.boolean().optional(),
		skipSyncSteps: z.boolean().optional(),
		quiet: z.boolean().optional(),
		planShown: z.boolean().optional(),
	}),
	run: async (context, input) => {
		const database = await context.connect();
		return runMigrations({
			...input,
			context: createTaskServiceContext(context, database),
			database,
		});
	},
});

export default migrateTask;
