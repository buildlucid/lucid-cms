import z from "zod";
import collectSeeds from "../../seed/collect-seeds.js";
import defineRuntimeTask from "./define-runtime-task.js";
import loadDevModules from "./load-dev-modules.js";

/** Lists every project and plugin seed by name, without opening a database connection. */
const seedListTask = defineRuntimeTask({
	input: z.object({}),
	run: async (context) =>
		Object.keys(
			collectSeeds({
				definitions: context.host.config.seeds.definitions,
				modules: await loadDevModules(context.dev.seeds),
			}),
		).sort(),
});

export default seedListTask;
