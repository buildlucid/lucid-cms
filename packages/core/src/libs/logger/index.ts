import { tryGetContext } from "hono/context-storage";
import type { LucidHonoGeneric } from "../../types/hono.js";
import createConsoleTransport from "./console-transport/index.js";
import type {
	LogEntry,
	LogEntryLevel,
	LogInput,
	LogLevel,
	LogTransport,
	LucidLogger,
} from "./types.js";

const LOG_LEVELS: Record<LogLevel, number> = {
	silent: -1,
	error: 0,
	warn: 1,
	info: 2,
	debug: 3,
} as const;

type LoggerState = {
	destroyed: boolean;
	level: LogLevel;
	transport: LogTransport;
};

let isBuffering = false;
let logBuffer: LogEntry[] = [];

/**
 * Reports provider failures without allowing logging to interrupt application work.
 */
const reportTransportError = (
	operation: "write" | "flush" | "destroy",
	error: unknown,
) => {
	try {
		console.error(`Lucid logger transport failed to ${operation}`, error);
	} catch {
		// Logging must never break application work.
	}
};

/**
 * Checks an entry against the configured process-level log threshold.
 */
const shouldLog = (
	currentLevel: LogLevel,
	messageLevel: LogEntryLevel,
): boolean => {
	return LOG_LEVELS[messageLevel] <= LOG_LEVELS[currentLevel];
};

/**
 * Reads the request ID from Hono's concurrency-safe async context when available.
 */
const getActiveRequestId = () => {
	return tryGetContext<LucidHonoGeneric>()?.get("requestId");
};

/**
 * Writes an entry while containing synchronous and asynchronous transport failures.
 */
const safelyWrite = (state: LoggerState, entry: LogEntry) => {
	if (state.destroyed) return;

	try {
		const result = state.transport.write(entry) as unknown;
		if (
			typeof result === "object" &&
			result !== null &&
			"then" in result &&
			typeof result.then === "function"
		) {
			void Promise.resolve(result).catch((error) => {
				reportTransportError("write", error);
			});
		}
	} catch (error) {
		reportTransportError("write", error);
	}
};

/**
 * Runs an optional transport lifecycle hook without leaking provider failures.
 */
const safelyRunTransportLifecycle = async (
	state: LoggerState,
	operation: "flush" | "destroy",
) => {
	if (state.destroyed) return;

	const fn = state.transport[operation];
	if (!fn) return;

	try {
		await fn();
	} catch (error) {
		reportTransportError(operation, error);
	}
};

/**
 * Binds logger methods to one state so replaced transports remain isolated.
 */
const createLogger = (state: LoggerState): LucidLogger => ({
	get level() {
		return state.level;
	},
	error: (log: LogInput) => {
		writeLog(state, "error", log);
	},
	warn: (log: LogInput) => {
		writeLog(state, "warn", log);
	},
	info: (log: LogInput) => {
		writeLog(state, "info", log);
	},
	debug: (log: LogInput) => {
		writeLog(state, "debug", log);
	},
	flush: () => safelyRunTransportLifecycle(state, "flush"),
});

/**
 * Creates the default process logger backed by the human-readable console transport.
 */
const createDefaultState = (): LoggerState => ({
	destroyed: false,
	level: "info",
	transport: createConsoleTransport(),
});

let loggerState = createDefaultState();
let logger = createLogger(loggerState);

/**
 * Creates the structured entry before buffering or delivering it.
 */
const writeLog = (state: LoggerState, level: LogEntryLevel, log: LogInput) => {
	if (!isBuffering && !shouldLog(state.level, level)) return;

	const requestId = log.requestId ?? getActiveRequestId();
	const entry: LogEntry = {
		...log,
		...(requestId ? { requestId } : {}),
		level,
		timestamp: new Date().toISOString(),
	};

	if (isBuffering) {
		logBuffer.push(entry);
		return;
	}

	safelyWrite(state, entry);
};

/**
 * Flushes pending work before releasing a transport and marks it closed.
 */
const closeLoggerTransport = async (state: LoggerState) => {
	if (state.destroyed) return;

	await safelyRunTransportLifecycle(state, "flush");
	await safelyRunTransportLifecycle(state, "destroy");
	state.destroyed = true;
};

/**
 * Replaces the active process logger after cleanly closing its previous transport.
 */
export const initializeLogger = async (props?: {
	transport?: LogTransport;
	level?: LogLevel;
}) => {
	await closeLoggerTransport(loggerState);

	const level = props?.level ?? "info";
	loggerState = {
		destroyed: false,
		level,
		transport:
			props?.transport ??
			createConsoleTransport({
				verbose: level === "debug",
			}),
	};
	logger = createLogger(loggerState);

	return logger;
};

/**
 * Buffers internal logs so they do not interrupt the CLI progress UI.
 */
export const startLoggerBuffering = () => {
	isBuffering = true;
};

/**
 * Drains CLI-buffered entries through the current transport and flushes it.
 */
export const stopLoggerBuffering = async () => {
	isBuffering = false;
	const bufferedEntries = logBuffer;
	logBuffer = [];

	if (loggerState.destroyed) {
		loggerState = createDefaultState();
		logger = createLogger(loggerState);
	}

	for (const entry of bufferedEntries) {
		if (shouldLog(loggerState.level, entry.level)) {
			safelyWrite(loggerState, entry);
		}
	}

	await safelyRunTransportLifecycle(loggerState, "flush");
};

/**
 * Flushes and closes the process transport while preserving CLI reload buffers.
 */
export const destroyLogger = async () => {
	await closeLoggerTransport(loggerState);
};

/**
 * Returns the active process logger used by the stable public proxy.
 */
export const getLogger = (): LucidLogger => logger;

const loggerProxy: LucidLogger = {
	get level() {
		return getLogger().level;
	},
	error: (log: LogInput) => getLogger().error(log),
	warn: (log: LogInput) => getLogger().warn(log),
	info: (log: LogInput) => getLogger().info(log),
	debug: (log: LogInput) => getLogger().debug(log),
	flush: () => getLogger().flush(),
};

export default loggerProxy;
