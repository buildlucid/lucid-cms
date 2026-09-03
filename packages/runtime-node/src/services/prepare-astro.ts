import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

type PrepareAstroOptions = {
	command: "dev" | "build" | "sync";
	generatedDirectory: string;
	projectRoot: string;
	runtimeModulePath: string;
};

/** Creates the production Node server entrypoint that starts Lucid's scheduler. */
const prepareAstro = async (options: PrepareAstroOptions) => {
	if (options.command !== "build") return;

	const serverEntrypoint = path.join(options.generatedDirectory, "server.ts");
	const relativeRuntimePath = path
		.relative(path.dirname(serverEntrypoint), options.runtimeModulePath)
		.split(path.sep)
		.join("/");
	const runtimeImportPath = relativeRuntimePath.startsWith(".")
		? relativeRuntimePath
		: `./${relativeRuntimePath}`;
	const projectRequire = createRequire(
		path.join(options.projectRoot, "package.json"),
	);
	const astroServerPath = projectRequire.resolve("@astrojs/node/server.js");

	await writeFile(
		serverEntrypoint,
		`import { createNodeJobScheduler } from "@lucidcms/runtime-node/runtime";
import { createLucidInvocation } from ${JSON.stringify(runtimeImportPath)};

export { handler, options, startServer } from ${JSON.stringify(astroServerPath)};

const jobScheduler = createNodeJobScheduler({
	createInvocation: async () => (await createLucidInvocation()).invocation,
});
jobScheduler.start();
`,
	);

	return {
		vite: {
			aliases: {
				"@astrojs/node/server.js": serverEntrypoint,
			},
		},
	};
};

export default prepareAstro;
