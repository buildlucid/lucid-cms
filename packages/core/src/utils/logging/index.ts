import winstonLogger from "./logger.js";
import type constants from "../../constants/constants.js";

export type LogLevel = "error" | "warn" | "info" | "debug";

export type LoggerScopes =
	(typeof constants.logScopes)[keyof typeof constants.logScopes];

const logger = (
	level: LogLevel,
	data: {
		message: string;
		scope?: LoggerScopes | string;
		data?: Record<string, unknown>;
	},
) => {
	let logFn = winstonLogger.error;

	switch (level) {
		case "error":
			logFn = winstonLogger.error;
			break;
		case "warn":
			logFn = winstonLogger.warn;
			break;
		case "info":
			logFn = winstonLogger.info;
			break;
		case "debug":
			logFn = winstonLogger.debug;
			break;
		default:
			logFn = winstonLogger.error;
			break;
	}

	logFn(messageFormat(level, data), data.data);
};

export const messageFormat = (
	level: LogLevel,
	data: {
		message: string;
		scope?: LoggerScopes | string;
	},
) => {
	// const timestamp = new Date().toISOString();
	const msgParts = [data.message];

	// TODO: get this implemented - tests need a solution for this as at the time of console log spy the times differ
	// if (level === "debug" || level === "error") {
	// 	msgParts.unshift(`[${timestamp}]`);
	// }

	if (data.scope) {
		msgParts.unshift(`[${data.scope}]`);
	}

	return msgParts.join(" ");
};

export default logger;
