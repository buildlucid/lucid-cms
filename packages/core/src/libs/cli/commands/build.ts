import { rm } from "node:fs/promises";
import getConfigPath from "../../config/get-config-path.js";
import loadConfigFile from "../../config/load-config-file.js";
import vite from "../../vite/index.js";
import installOptionalDeps from "../utils/install-optional-deps.js";
import prerenderMjmlTemplates from "../../email/prerender-mjml-templates.js";

const buildCommand = async () => {
	await installOptionalDeps();

	const startTime = process.hrtime();

	const configPath = getConfigPath(process.cwd());
	const res = await loadConfigFile({ path: configPath });

	await rm(res.config.compilerOptions?.outDir, {
		recursive: true,
		force: true,
	});

	await prerenderMjmlTemplates(res.config);

	const buildResponse = await vite.buildApp(res.config);
	if (buildResponse.error) {
		console.error(buildResponse.error.message);
		process.exit(1);
	}

	await res.adapter?.cli?.build(res.config, {
		configPath,
		outputPath: res.config.compilerOptions?.outDir,
	});

	console.log(`Build completed in ${process.hrtime(startTime)[1] / 1000000}ms`);

	process.exit(0);
};

export default buildCommand;
