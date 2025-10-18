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
let isBuffering = false;
let logBuffer: Array<{ level: LogLevel; log: LogData }> = [];

const shouldLog = (currentLevel: LogLevel, messageLevel: LogLevel): boolean => {
	return LOG_LEVELS[messageLevel] <= LOG_LEVELS[currentLevel];
};

const writeLog = (
	level: LogLevel,
	log: LogData,
	transport: LogTransport,
	configLevel: LogLevel,
) => {
	if (isBuffering) {
		logBuffer.push({ level, log });
		return;
	}

	if (shouldLog(configLevel, level)) {
		transport(level, log);
	}
};

export const initializeLogger = (props?: {
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
			writeLog("error", log, transport, level);
		},
		warn: (log: LogData) => {
			writeLog("warn", log, transport, level);
		},
		info: (log: LogData) => {
			writeLog("info", log, transport, level);
		},
		debug: (log: LogData) => {
			writeLog("debug", log, transport, level);
		},
		setBuffering: (enabled: boolean) => {
			isBuffering = enabled;
			if (!enabled) {
				flushBuffer();
			}
		},
		flushBuffer: () => {
			flushBuffer();
		},
		clearBuffer: () => {
			logBuffer = [];
		},
	} satisfies LucidLogger;
};

const flushBuffer = () => {
	if (!logger) return;

	for (const { level, log } of logBuffer) {
		if (shouldLog(logger.config.level, level)) {
			logger.config.transport(level, log);
		}
	}
	logBuffer = [];
};

if (!logger) initializeLogger();

export const getLogger = (): LucidLogger => {
	if (!logger) {
		throw new Error(
			"Logger has not been initialized. Call initializeLogger() first.",
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
	setBuffering: (enabled: boolean) => getLogger().setBuffering(enabled),
	flushBuffer: () => getLogger().flushBuffer(),
	clearBuffer: () => getLogger().clearBuffer(),
};

export default loggerProxy;
