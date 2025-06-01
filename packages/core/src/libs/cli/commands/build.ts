import { build } from "rolldown";
import { rm, writeFile } from "node:fs/promises";
import getConfigPath from "../../config/get-config-path.js";
import getConfig from "../../config/get-config.js";
import vite from "../../vite/index.js";
import installOptionalDeps from "../utils/install-optional-deps.js";

/**
 * @todo currently prettier and a few other packages are being bundled that we dont want. This is due to MJML it seems.
 *       MJML will likley need precompilling here instead anyway as it isnt supported in certain runtimes.
 * @todo remove the argon2 external dependency after this has been replaced with something else. Argon2 is not supported in
 *       certain runtimes like Cloudflare and potentially Deno?
 */
const buildCommand = async () => {
	await installOptionalDeps();

	const startTime = process.hrtime();

	await rm("dist", { recursive: true, force: true });

	const configPath = getConfigPath(process.cwd());
	const config = await getConfig({ path: configPath });

	const buildResponse = await vite.buildApp(config);
	if (buildResponse.error) {
		console.error(buildResponse.error.message);
		process.exit(1);
	}

	await build({
		input: configPath,
		output: {
			file: "dist/lucid.config.js",
			format: "esm",
			// minify: true,
			inlineDynamicImports: true,
		},
		platform: "node",
		external: ["argon2"],
	});

	// TODO: once adapters are supported, this will live in the adapter
	const entry = `
    import config from "./lucid.config.js";
    import lucid from "@lucidcms/core";

    await lucid.start({
        lucidConfig: await config,
    });`;

	await writeFile("dist/server.js", entry);

	console.log(`Build completed in ${process.hrtime(startTime)[1] / 1000000}ms`);

	process.exit(0);
};

export default buildCommand;
