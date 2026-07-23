import type { z } from "zod";
import type { LogLevelSchema } from "./schema.js";

export type LogLevel = z.infer<typeof LogLevelSchema>;
export type LogEntryLevel = Exclude<LogLevel, "silent">;

export type LogInput = {
	/**
	 * The active HTTP request identifier when the entry belongs to a request.
	 */
	requestId?: string;
	/**
	 * A stable identifier for the event. Useful when querying structured logs.
	 */
	event?: string;
	scope?: string;
	message: string;
	data?: Record<string, unknown>;
	error?: unknown;
};

/**
 * A complete log record passed to the configured transport.
 */
export type LogEntry = Readonly<
	LogInput & {
		level: LogEntryLevel;
		timestamp: string;
	}
>;

/**
 * A process-level destination for Lucid logs.
 *
 * `write` should synchronously enqueue the entry. Transports that batch or send
 * logs asynchronously should complete pending work from `flush` or `destroy`.
 */
export type LogTransport = {
	write: (entry: LogEntry) => void;
	flush?: () => Promise<void> | void;
	destroy?: () => Promise<void> | void;
};

/**
 * Lucid uses one logger instance per process.
 */
export type LucidLogger = {
	readonly level: LogLevel;
	error: (log: LogInput) => void;
	warn: (log: LogInput) => void;
	info: (log: LogInput) => void;
	debug: (log: LogInput) => void;
	flush: () => Promise<void>;
};
