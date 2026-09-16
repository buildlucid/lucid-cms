import { logger } from "@lucidcms/core";
import type { LogEntry } from "@lucidcms/core/types";

export type WorkerLogMessage = {
	type: "LOG";
	entry: LogEntry;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** Parses log messages at the worker boundary before using the host logger. */
export const relayWorkerLog = (message: unknown) => {
	if (
		!isRecord(message) ||
		message.type !== "LOG" ||
		!isRecord(message.entry)
	) {
		return;
	}

	const entry = message.entry;
	if (
		typeof entry.message !== "string" ||
		(entry.level !== "error" &&
			entry.level !== "warn" &&
			entry.level !== "info" &&
			entry.level !== "debug")
	) {
		return;
	}

	logger[entry.level]({
		message: entry.message,
		owner: typeof entry.owner === "string" ? entry.owner : undefined,
		event: typeof entry.event === "string" ? entry.event : undefined,
		scope: typeof entry.scope === "string" ? entry.scope : undefined,
		requestId:
			typeof entry.requestId === "string" ? entry.requestId : undefined,
		dedupeKey:
			typeof entry.dedupeKey === "string" ? entry.dedupeKey : undefined,
		data: isRecord(entry.data) ? entry.data : undefined,
		error: entry.error,
	});
};
