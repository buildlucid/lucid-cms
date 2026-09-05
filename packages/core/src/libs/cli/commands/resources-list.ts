import path from "node:path";
import loadConfigFile from "../../config/load-config-file.js";
import { resourceKinds } from "../../resources/types.js";
import cliLogger from "../logger.js";

/** Shows the files selected by discovery without executing migrations, seeds or jobs. */
const resourcesListCommand = async (options: { json?: boolean }) => {
	try {
		const { resources, config, projectRoot } = await loadConfigFile({
			silent: true,
			validateEnvSchema: false,
			processConfigOptions: { mode: "build" },
		});
		if (options.json) {
			console.log(
				JSON.stringify(
					{
						discovery: config.discovery,
						modules: resources.modules,
						files: resources.files,
					},
					null,
					2,
				),
			);
			return;
		}
		for (const kind of resourceKinds) {
			const registered =
				kind === "collections" ||
				kind === "tables" ||
				kind === "routes" ||
				kind === "hooks" ||
				kind === "jobs"
					? new Set(resources.modules[kind])
					: undefined;
			const files = resources.files[kind].filter(
				(file) => !registered || registered.has(file.path),
			);
			cliLogger.info(`${kind}: ${files.length} file(s)`);
			for (const file of files) {
				const filename = path.relative(projectRoot, file.path);
				cliLogger.log(
					kind === "public" ? `${filename} → /${file.name}` : filename,
					{ indent: 1 },
				);
			}
		}
	} catch (error) {
		if (error instanceof Error)
			cliLogger.errorInstance(error, "Could not list resources");
		else cliLogger.error("Could not list resources", "Unknown error");
		process.exitCode = 1;
	}
};

export default resourcesListCommand;
