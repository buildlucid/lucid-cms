import z from "zod";
import cliLogger from "../../cli/logger.js";
import createTaskServiceContext from "./create-task-service-context.js";
import defineRuntimeTask from "./define-runtime-task.js";

/** Drops every database table and clears KV, with confirmation handled by commands before execution. */
const migrateResetTask = defineRuntimeTask({
	input: z.object({}),
	run: async (context) => {
		const database = await context.connect();
		await context.host.config.db.dropAllTables(database);
		cliLogger.success(
			"All tables dropped",
			cliLogger.color.green("successfully"),
		);

		cliLogger.info("Clearing KV cache...");
		const serviceContext = createTaskServiceContext(context, database);
		await serviceContext.kv.clear(serviceContext);
		return { status: "complete" } as const;
	},
});

export default migrateResetTask;
