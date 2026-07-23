import type { LogEntry, LogTransport } from "../types.js";
import {
	colorize,
	consoleColors,
	createPrefix,
	formatTimestamp,
	getConsoleLogger,
	getErrorMessage,
	levelLabels,
} from "./formatters.js";
import { writeHttpEntry } from "./http.js";
import type {
	ConsoleTransportOptions,
	ResolvedConsoleTransportOptions,
} from "./types.js";

export type { ConsoleTransportOptions } from "./types.js";

/**
 * Prints full errors and structured data only when verbose console output is enabled.
 */
const writeVerboseDetails = (
	entry: LogEntry,
	options: ResolvedConsoleTransportOptions,
) => {
	if (!options.verbose) return;

	const consoleLogger = getConsoleLogger(entry.level);

	if (entry.error instanceof Error && entry.error.stack) {
		consoleLogger(
			colorize(`  ${entry.error.stack}`, consoleColors.dim, options.colors),
		);
	}
	if (entry.data !== undefined) {
		consoleLogger(
			colorize("  Data:", consoleColors.dim, options.colors),
			entry.data,
		);
	}
};

/**
 * Renders a standard entry as a concise line and appends verbose details when requested.
 */
const writeDefaultEntry = (
	entry: LogEntry,
	options: ResolvedConsoleTransportOptions,
) => {
	const prefix = createPrefix({
		color: consoleColors[entry.level],
		colors: options.colors,
		label: levelLabels[entry.level],
		scope: entry.scope,
		timestamp: formatTimestamp(entry.timestamp, options.timestamps),
	});
	const errorMessage = getErrorMessage(entry);
	const errorSuffix =
		errorMessage && !entry.message.includes(errorMessage)
			? ` — ${errorMessage}`
			: "";

	getConsoleLogger(entry.level)(`${prefix}  ${entry.message}${errorSuffix}`);
	writeVerboseDetails(entry, options);
};

/**
 * Creates the built-in human-readable transport without changing structured entries.
 */
const createConsoleTransport = (
	inputOptions: ConsoleTransportOptions = {},
): LogTransport => {
	const options: ResolvedConsoleTransportOptions = {
		colors:
			inputOptions.colors ??
			(typeof process !== "undefined" &&
				Boolean(process.stdout?.isTTY || process.stderr?.isTTY)),
		timestamps: inputOptions.timestamps ?? true,
		verbose: inputOptions.verbose ?? false,
	};

	return {
		write: (entry) => {
			if (
				entry.event === "http.request.completed" &&
				writeHttpEntry(entry, options)
			) {
				return;
			}

			writeDefaultEntry(entry, options);
		},
	};
};

export default createConsoleTransport;
