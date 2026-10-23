import z from "zod";
import { LucidError } from "../../../utils/errors/index.js";
import createToolkit from "../../toolkit/create-toolkit.js";
import createTaskServiceContext from "./create-task-service-context.js";
import defineRuntimeTask from "./define-runtime-task.js";

/** Runs one of a plugin's `tasks` for its CLI commands, with a service context and toolkit. */
const pluginTask = defineRuntimeTask({
	input: z.object({
		key: z.string(),
		name: z.string(),
		input: z.unknown(),
	}),
	run: async (context, input) => {
		const task = context.host.config.plugins.find(
			(plugin) => plugin.key === input.key,
		)?.tasks?.[input.name];
		if (!task) {
			throw new LucidError({
				message: `The "${input.key}" plugin has no "${input.name}" task.`,
			});
		}

		const serviceContext = createTaskServiceContext(
			context,
			await context.connect(),
		);

		return task.run({
			context: serviceContext,
			toolkit: createToolkit(serviceContext),
			input: task.input.parse(input.input),
		});
	},
});

export default pluginTask;
