import type { LogData, LogLevel, LogTransport } from "./types.js";

export type ConsoleTransportOptions = {
	colors?: boolean;
	timestamps?: boolean;
};

const createConsoleTransport = (
	options: ConsoleTransportOptions = {},
): LogTransport => {
	const { colors = true, timestamps = true } = options;

	const colorMap: Record<LogLevel, string> = {
		error: "\x1b[31m", // red
		warn: "\x1b[33m", // yellow
		info: "\x1b[36m", // cyan
		debug: "\x1b[90m", // grey
		silent: "",
	};

	const reset = "\x1b[0m";

	return (level: LogLevel, log: LogData) => {
		if (level === "silent") return;

		const timestamp = timestamps ? `${new Date().toISOString()} ` : "";
		const color = colors ? colorMap[level] : "";
		const resetColor = colors ? reset : "";

		const prefix = `${timestamp}${color}[${level.toUpperCase()}${log.scope ? `:${log.scope.toUpperCase()}` : ""}]${resetColor}`;

		let consoleLogger:
			| Console["log"]
			| Console["error"]
			| Console["warn"]
			| Console["info"]
			| Console["debug"];

		switch (level) {
			case "error":
				consoleLogger = console.info;
				break;
			case "warn":
				consoleLogger = console.warn;
				break;
			case "info":
				consoleLogger = console.info;
				break;
			case "debug":
				consoleLogger = console.debug;
				break;
			default:
				consoleLogger = console.log;
				break;
		}

		try {
			const data = log.data ? JSON.stringify(log.data) : undefined;

			consoleLogger(`${prefix} ${log.message}`, data ? data : "");
		} catch (_e) {
			consoleLogger(`${prefix} ${log.message}`);
		}
	};
};

export default createConsoleTransport;
