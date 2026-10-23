import { stripVTControlCharacters } from "node:util";
import { createLogger, type Logger, type LogLevel } from "vite";
import cliSpinner from "../spinner.js";

/** Vite's restart message, which Lucid's dev command reports itself. */
const restartMessage = /server restarted\./;
/** Dependency optimisation, which Lucid's output leaves out, other than beside the CLI's spinner. */
const dependencyMessages = [
	/re-optimization of dependencies/,
	/Re-optimizing dependencies/,
	/new dependencies optimized/,
	/optimized dependencies changed/,
];

/** Logs client updates and warnings without clearing the screen, hides routine server messages, and routes dependency optimisation to the CLI spinner. */
const createViteLogger = (level: LogLevel = "info"): Logger => {
	const logger = createLogger(level, { allowClearScreen: false });
	const info = logger.info;

	// Overridden in place, as Vite updates the logger's own state, such as `hasWarned`.
	logger.info = (message, options) => {
		const plain = stripVTControlCharacters(message);
		if (dependencyMessages.some((pattern) => pattern.test(plain))) {
			cliSpinner.detail(message);
			return;
		}

		const environment =
			options?.environment && stripVTControlCharacters(options.environment);
		if (
			restartMessage.test(plain) ||
			(environment && environment !== "(client)")
		) {
			return;
		}

		info(message, options);
	};

	return logger;
};

export default createViteLogger;
