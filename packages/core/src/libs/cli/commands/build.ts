import { build } from "rolldown";
import { writeFile } from "node:fs/promises";
import getConfigPath from "../../config/get-config-path.js";

const buildCommand = async () => {
	const configPath = getConfigPath(process.cwd());

	await build({
		input: configPath,
		output: {
			dir: "dist",
			format: "esm",
			minify: true,
		},
		treeshake: true,
		platform: "neutral",
		external: [/^[^./]/],
	});

	// TODO: once adapters are supported, this will live in the adapter
	const entry = `
    import config from "./lucid.config.js";
    import lucid from "@lucidcms/core";

    const server = await lucid.start({
        lucidConfig: await config,
    });`;

	await writeFile("dist/index.js", entry);

	process.exit(0);
};

export default buildCommand;
