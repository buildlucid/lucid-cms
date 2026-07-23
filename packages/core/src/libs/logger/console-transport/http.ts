import type { LogEntry } from "../types.js";
import {
	colorize,
	consoleColors,
	createPrefix,
	formatDuration,
	formatTimestamp,
} from "./formatters.js";
import type { ResolvedConsoleTransportOptions } from "./types.js";

/**
 * Identifies successful admin bundles that add noise to normal development logs.
 */
const isSuccessfulAdminAsset = (entry: LogEntry) => {
	if (entry.event !== "http.request.completed") return false;

	const path = entry.data?.path;
	const status = entry.data?.status;

	return (
		typeof path === "string" &&
		path.startsWith("/lucid/assets/") &&
		typeof status === "number" &&
		status < 400
	);
};

/**
 * Renders HTTP completion entries on one line and reports whether it handled them.
 */
export const writeHttpEntry = (
	entry: LogEntry,
	options: ResolvedConsoleTransportOptions,
) => {
	if (!options.verbose && isSuccessfulAdminAsset(entry)) return true;

	const method = entry.data?.method;
	const path = entry.data?.path;
	const status = entry.data?.status;
	const durationMs = entry.data?.durationMs;

	if (
		typeof method !== "string" ||
		typeof path !== "string" ||
		typeof status !== "number" ||
		typeof durationMs !== "number"
	) {
		return false;
	}

	const statusColor =
		status >= 500
			? consoleColors.error
			: status >= 400
				? consoleColors.warn
				: consoleColors.success;
	const prefix = createPrefix({
		color: consoleColors.http,
		colors: options.colors,
		label: "HTTP",
		timestamp: formatTimestamp(entry.timestamp, options.timestamps),
	});
	const statusLabel = colorize(String(status), statusColor, options.colors);

	console.info(
		`${prefix}  ${method} ${path}  ${statusLabel}  ${formatDuration(durationMs)}`,
	);

	if (options.verbose) {
		console.info(
			colorize("  Data:", consoleColors.dim, options.colors),
			entry.data,
		);
	}

	return true;
};
