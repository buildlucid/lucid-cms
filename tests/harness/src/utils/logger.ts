import pc from "picocolors";

/** Prints one progress line for a setup. */
const logger = {
	step: (scope: string, message: string) => {
		console.log(`${pc.dim(`[${scope}]`)} ${message}`);
	},
	error: (scope: string, message: string) => {
		console.error(`${pc.dim(`[${scope}]`)} ${pc.red(message)}`);
	},
};

export default logger;
