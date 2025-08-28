import { existsSync } from "node:fs";

/**
 * A number of dependencies that are needed for the dev and build commands are set as optional dependencies
 * as they're only required for the CLI and not when running on a server.Add commentMore actions
 *
 * This function will check if the dependencies are installed and if not, it will prompt the user to install them.
 *
 * @todo - replace logging with a helper to style the output.
 */
const installOptionalDeps = async () => {
	const optionalDeps = [
		"jiti",
		"chokidar",
		"minimatch",
		"commander",
		"@inquirer/prompts",
		"vite-plugin-solid",
		"rolldown",
		// "@lucidcms/admin",
		"solid-js",
		"@tailwindcss/vite",
		"tailwindcss",
		"vite",
		"mjml",
	];

	//* due to core having @lucidcms/admin as a devDependency set to *, we dont want to run this check in our workspace environment
	//* potential conflicts if users have the same structure - not the end of the world though, theyd have @lucidcms/admin installed anyway.
	const isWorkspace =
		process.cwd().includes("packages/core") ||
		existsSync("../../packages/admin");
	if (!isWorkspace) optionalDeps.push("@lucidcms/admin");

	const missingDeps = [];

	for (const dep of optionalDeps) {
		try {
			await import(dep);
		} catch (error) {
			missingDeps.push(dep);
		}
	}

	if (missingDeps.length > 0) {
		console.error(
			`Please install the following dependencies to continue: ${missingDeps.join(", ")}`,
		);
		process.exit(1);
	}
};

export default installOptionalDeps;
