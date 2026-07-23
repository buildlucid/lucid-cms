import type { LogEntry, LogEntryLevel } from "../types.js";

export const consoleColors = {
	reset: "\x1b[0m",
	dim: "\x1b[2m",
	error: "\x1b[31m",
	warn: "\x1b[33m",
	info: "\x1b[36m",
	debug: "\x1b[90m",
	http: "\x1b[35m",
	success: "\x1b[32m",
};

export const levelLabels: Record<LogEntryLevel, string> = {
	error: "ERROR",
	warn: "WARN",
	info: "INFO",
	debug: "DEBUG",
};

/**
 * Routes each log level through the matching console output stream.
 */
export const getConsoleLogger = (
	level: LogEntryLevel,
): Console["error"] | Console["warn"] | Console["info"] | Console["debug"] => {
	switch (level) {
		case "error":
			return console.error;
		case "warn":
			return console.warn;
		case "info":
			return console.info;
		case "debug":
			return console.debug;
	}
};

/**
 * Extracts a short error message so normal console logs stay on one line.
 */
export const getErrorMessage = (entry: LogEntry): string | undefined => {
	if (entry.error instanceof Error) return entry.error.message;
	if (typeof entry.error === "string") return entry.error;

	if (
		typeof entry.error === "object" &&
		entry.error !== null &&
		"message" in entry.error &&
		typeof entry.error.message === "string"
	) {
		return entry.error.message;
	}

	const dataErrorMessage = entry.data?.errorMessage;
	return typeof dataErrorMessage === "string" ? dataErrorMessage : undefined;
};

/**
 * Formats structured timestamps as compact local times for human output.
 */
export const formatTimestamp = (timestamp: string, enabled: boolean) => {
	if (!enabled) return undefined;

	const date = new Date(timestamp);
	if (Number.isNaN(date.getTime())) return timestamp;

	return [date.getHours(), date.getMinutes(), date.getSeconds()]
		.map((part) => String(part).padStart(2, "0"))
		.join(":");
};

/**
 * Keeps HTTP durations compact while retaining useful precision.
 */
export const formatDuration = (durationMs: number) => {
	if (durationMs < 1000) return `${Math.round(durationMs)}ms`;
	return `${(durationMs / 1000).toFixed(2)}s`;
};

/**
 * Applies terminal color only when the active console supports it.
 */
export const colorize = (value: string, color: string, enabled: boolean) => {
	return enabled ? `${color}${value}${consoleColors.reset}` : value;
};

/**
 * Builds an aligned prefix shared by standard and HTTP console entries.
 */
export const createPrefix = (props: {
	color: string;
	colors: boolean;
	label: string;
	scope?: string;
	timestamp?: string;
}) => {
	const parts = [];

	if (props.timestamp) {
		parts.push(colorize(props.timestamp, consoleColors.dim, props.colors));
	}

	parts.push(colorize(props.label.padEnd(5), props.color, props.colors));

	if (props.scope) {
		parts.push(colorize(props.scope, consoleColors.dim, props.colors));
	}

	return parts.join("  ");
};
