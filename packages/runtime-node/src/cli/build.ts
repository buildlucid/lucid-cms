import { buildModuleId } from "@lucidcms/core/build";
import type { BuildHandler } from "@lucidcms/core/types";
import constants from "../constants.js";
import getRuntimeContext from "../services/runtime-context.js";

/** Describes the Node server bundle, keeping packages and Lucid build data external for loading from disk. */
const buildCommand: BuildHandler = async ({ logger }) => {
	logger.instance.info(
		"Using:",
		logger.instance.color.blue("Node Runtime Adapter"),
		{
			silent: logger.silent,
		},
	);

	return {
		entries: {
			[constants.ENTRY]: `import build from "${buildModuleId}";
import { startServer } from "@lucidcms/runtime-node/entry";

startServer(build);
`,
			[constants.BUILD_MODULE]: `export { default } from "${buildModuleId}";\n`,
		},
		bundle: {
			packages: "external",
			buildData: "external",
		},
		runtimeContext: getRuntimeContext({
			compiled: true,
		}),
	};
};

export default buildCommand;
