import type { z } from "zod";
import type { LogLevelSchema } from "./schema.js";

export type LogLevel = z.infer<typeof LogLevelSchema>;
export type LogEntryLevel = Exclude<LogLevel, "silent">;

/** Structured log entry accepted by logger methods. */
export type LogInput = {
	/** Emit this key once per owner until the logger is reinitialized. */
	dedupeKey?: string;
	/** Component responsible for the entry. Defaults to "core". */
	owner?: string;
	/**
	 * The active HTTP request identifier when the entry belongs to a request.
	 */
	requestId?: string;
	/**
	 * A stable identifier for the event. Useful when querying structured logs.
	 */
	event?: string;
	/** Subsystem or context within the owner responsible for this event. */
	scope?: string;
	/** Human-readable description of what happened. */
	message: string;
	/** Structured details useful when investigating the event. */
	data?: Record<string, unknown>;
	/** Original error or cause to include with the entry. */
	error?: unknown;
};

/**
 * A complete log record passed to the configured transport.
 */
export type LogEntry = Readonly<
	Omit<LogInput, "owner"> & {
		/** Component responsible for the entry. */
		owner: string;
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
	/** Finish writing buffered entries. */
	flush?: () => Promise<void> | void;
	/** Flush pending work and release transport resources. */
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
