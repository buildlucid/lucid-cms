import z from "zod";
import createTaskServiceContext from "./create-task-service-context.js";
import defineRuntimeTask from "./define-runtime-task.js";

/** Clears Lucid's KV keys, as the admin's Clear KV action does. */
const kvClearTask = defineRuntimeTask({
	input: z.object({}),
	run: async (context) => {
		const serviceContext = createTaskServiceContext(
			context,
			await context.connect(),
		);
		await serviceContext.kv.clear(serviceContext);
		return { adapter: serviceContext.kv.key };
	},
});

export default kvClearTask;
