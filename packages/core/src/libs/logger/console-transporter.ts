import type { LogData, LogLevel, LogTransport } from "./types.js";

export type ConsoleTransportOptions = {
	colours?: boolean;
	timestamps?: boolean;
};

const createConsoleTransport = (
	options: ConsoleTransportOptions = {},
): LogTransport => {
	const { colours = true, timestamps = true } = options;

	const colourMap: Record<LogLevel, string> = {
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
		const colour = colours ? colourMap[level] : "";
		const resetColour = colours ? reset : "";

		const prefix = `${timestamp}${colour}[${level.toUpperCase()}${log.scope ? `:${log.scope.toUpperCase()}` : ""}]${resetColour}`;

		let consoleLogger:
			| Console["log"]
			| Console["error"]
			| Console["warn"]
			| Console["info"]
			| Console["debug"];

		switch (level) {
			case "error":
				consoleLogger = console.error;
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
			consoleLogger(
				`${prefix} ${log.message}`,
				log.data ? JSON.stringify(log.data) : undefined,
			);
		} catch (_e) {
			consoleLogger(`${prefix} ${log.message}`);
		}
	};
};

export default createConsoleTransport;
