import type { LogEntry } from "../types.js";
import {
	colorize,
	consoleColors,
	createPrefix,
	formatSingleLine,
	formatStructuredValue,
	formatTimestamp,
	getConsoleLogger,
	levelLabels,
} from "./formatters.js";
import type { ResolvedConsoleTransportOptions } from "./types.js";

const MAX_ISSUES = 3;

type ValidationIssue = { path: string; message: string };

const isValidationIssue = (value: unknown): value is ValidationIssue =>
	typeof value === "object" &&
	value !== null &&
	"path" in value &&
	typeof value.path === "string" &&
	"message" in value &&
	typeof value.message === "string";

/** Writes query validation failures as one console line and reports whether the entry was handled. */
export const writeQueryValidationEntry = (
	entry: LogEntry,
	options: ResolvedConsoleTransportOptions,
) => {
	const table = entry.data?.table;
	const method = entry.data?.method;
	const issues = entry.data?.issues;

	if (
		typeof table !== "string" ||
		typeof method !== "string" ||
		!Array.isArray(issues) ||
		!issues.every(isValidationIssue)
	) {
		return false;
	}

	const prefix = createPrefix({
		color: consoleColors[entry.level],
		colors: options.colors,
		label: levelLabels[entry.level],
		owner: entry.owner,
		scope: entry.scope,
		timestamp: formatTimestamp(entry.timestamp, options.timestamps),
	});
	const query = colorize(
		`${table}.${method}`,
		consoleColors.dim,
		options.colors,
	);
	const shown = issues
		.slice(0, MAX_ISSUES)
		.map((issue) =>
			issue.path ? `${issue.path}: ${issue.message}` : issue.message,
		);
	if (issues.length > MAX_ISSUES) {
		shown.push(
			colorize(
				`+${issues.length - MAX_ISSUES} more`,
				consoleColors.dim,
				options.colors,
			),
		);
	}

	const verboseDetails = options.verbose
		? colorize(
				` — data: ${formatStructuredValue(entry.data)}`,
				consoleColors.dim,
				options.colors,
			)
		: "";

	getConsoleLogger(entry.level)(
		formatSingleLine(
			`${prefix} ${entry.message} ${query} — ${shown.join("; ")}${verboseDetails}`,
		),
	);

	return true;
};
