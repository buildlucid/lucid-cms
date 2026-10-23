import z from "zod";
import cliLogger from "../../cli/logger.js";
import createTaskServiceContext from "./create-task-service-context.js";
import defineRuntimeTask from "./define-runtime-task.js";
import runSyncTasks from "./run-sync-tasks.js";

/** Runs Lucid's sync tasks, such as syncing locales and collections, then clears KV. */
const syncTask = defineRuntimeTask({
	input: z.object({}),
	run: async (context) => {
		const serviceContext = createTaskServiceContext(
			context,
			await context.connect(),
		);
		const synced = await runSyncTasks(serviceContext);
		if (!synced) return { synced };

		cliLogger.info("Clearing KV cache...");
		await serviceContext.kv.clear(serviceContext);
		return { synced };
	},
});

export default syncTask;
