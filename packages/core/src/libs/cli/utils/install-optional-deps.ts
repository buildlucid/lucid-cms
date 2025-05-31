/**
 * A number of dependencies that are needed for the dev and build commands are set as optional dependencies
 * as they're only required for the CLI and not when running on a server.
 *
 * This function will check if the dependencies are installed and if not, it will prompt the user to install them.
 *
 * @todo - once this CLI and servless support is finished, we should move these pacakges listed here to optionalDependencies
 * in the package.json file. Currently we're using them on server startup and so theyre needed.
 * @todo - replace logging with a helper to style the output.
 */
const installOptionalDeps = async () => {
	const optionalDeps = [
		"jiti",
		"vite",
		"solid-js",
		"tailwindcss",
		"@tailwindcss/vite",
	];

	let currentTarget = optionalDeps[0];

	try {
		for (const dep of optionalDeps) {
			currentTarget = dep;
			console.log(`Installing ${currentTarget}...`);
			await import(currentTarget);
		}
	} catch (error) {
		console.error(
			`${currentTarget} is not installed. Please install it to continue.`,
		);
		process.exit(1);
	}
};

export default installOptionalDeps;
