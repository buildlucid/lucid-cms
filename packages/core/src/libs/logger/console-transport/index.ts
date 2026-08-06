import type { LogEntry, LogTransport } from "../types.js";
import {
	colorize,
	consoleColors,
	createPrefix,
	formatSingleLine,
	formatStructuredValue,
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
 * Formats verbose error and data details for the entry's primary line.
 */
const formatVerboseDetails = (
	entry: LogEntry,
	options: ResolvedConsoleTransportOptions,
) => {
	if (!options.verbose) return "";

	const details = [];
	if (entry.error instanceof Error && entry.error.stack) {
		details.push(`stack: ${formatStructuredValue(entry.error.stack)}`);
	}
	if (entry.data !== undefined) {
		details.push(`data: ${formatStructuredValue(entry.data)}`);
	}

	return details.length > 0
		? colorize(` — ${details.join(" — ")}`, consoleColors.dim, options.colors)
		: "";
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

	getConsoleLogger(entry.level)(
		formatSingleLine(
			`${prefix} ${entry.message}${errorSuffix}${formatVerboseDetails(entry, options)}`,
		),
	);
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
