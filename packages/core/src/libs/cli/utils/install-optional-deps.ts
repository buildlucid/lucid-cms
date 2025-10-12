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
		"rolldown",
		"mjml",
	];

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
