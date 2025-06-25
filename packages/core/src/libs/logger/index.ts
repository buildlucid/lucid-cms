import createConsoleTransport from "./console-transporter.js";
import type { LogLevel, LogData, LogTransport, LucidLogger } from "./types.js";

const LOG_LEVELS: Record<LogLevel, number> = {
	silent: -1,
	error: 0,
	warn: 1,
	info: 2,
	debug: 3,
} as const;

let logger: LucidLogger | null = null;

const shouldLog = (currentLevel: LogLevel, messageLevel: LogLevel): boolean => {
	return LOG_LEVELS[messageLevel] <= LOG_LEVELS[currentLevel];
};

export const initialiseLogger = (props?: {
	transport?: LogTransport;
	level?: LogLevel;
	force?: boolean;
}) => {
	const level = props?.level ?? "info";
	const force = props?.force ?? false;
	const transport = props?.transport ?? createConsoleTransport();

	if (logger && !force) return logger;

	logger = {
		config: {
			level: level,
			transport: transport,
		},
		error: (log: LogData) => {
			if (shouldLog(level, "error")) {
				transport("error", log);
			}
		},
		warn: (log: LogData) => {
			if (shouldLog(level, "warn")) {
				transport("warn", log);
			}
		},
		info: (log: LogData) => {
			if (shouldLog(level, "info")) {
				transport("info", log);
			}
		},
		debug: (log: LogData) => {
			if (shouldLog(level, "debug")) {
				transport("debug", log);
			}
		},
	} satisfies LucidLogger;
};
if (!logger) initialiseLogger();

export const getLogger = (): LucidLogger => {
	if (!logger) {
		throw new Error(
			"Logger has not been initialised. Call initialiseLogger() first.",
		);
	}
	return logger;
};

const loggerProxy: LucidLogger = {
	get config() {
		return getLogger().config;
	},
	error: (log: LogData) => getLogger().error(log),
	warn: (log: LogData) => getLogger().warn(log),
	info: (log: LogData) => getLogger().info(log),
	debug: (log: LogData) => getLogger().debug(log),
};

export default loggerProxy;
