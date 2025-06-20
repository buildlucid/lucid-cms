import { rm } from "node:fs/promises";
import getConfigPath from "../../config/get-config-path.js";
import getConfig from "../../config/get-config.js";
import vite from "../../vite/index.js";
import installOptionalDeps from "../utils/install-optional-deps.js";
import prerenderMjmlTemplates from "../../email/prerender-mjml-templates.js";

/**
 * @todo remove the argon2 external dependency after this has been replaced with something else. Argon2 is not supported in
 *       certain runtimes like Cloudflare and potentially Deno?
 */
const buildCommand = async () => {
	await installOptionalDeps();

	const startTime = process.hrtime();

	const configPath = getConfigPath(process.cwd());
	const config = await getConfig({ path: configPath });

	await rm(config.compilerOptions?.outDir, { recursive: true, force: true });

	await prerenderMjmlTemplates(config);

	const buildResponse = await vite.buildApp(config);
	if (buildResponse.error) {
		console.error(buildResponse.error.message);
		process.exit(1);
	}

	await config.adapter.cli?.build(config, {
		configPath,
		outputPath: config.compilerOptions?.outDir,
	});

	console.log(`Build completed in ${process.hrtime(startTime)[1] / 1000000}ms`);

	process.exit(0);
};

export default buildCommand;
