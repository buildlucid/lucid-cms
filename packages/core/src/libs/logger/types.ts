import type { z } from "zod/v4";
import type { LogLevelSchema } from "./schema.js";

export type LogLevel = z.infer<typeof LogLevelSchema>;

export type LogData = {
	scope?: string;
	message: string;
	data?: Record<string, unknown>;
};

export type LogTransport = (level: LogLevel, log: LogData) => void;

export type LucidLogger = {
	readonly config: {
		level: LogLevel;
		transport: LogTransport;
	};
	error: (log: LogData) => void;
	warn: (log: LogData) => void;
	info: (log: LogData) => void;
	debug: (log: LogData) => void;
	setBuffering: (enabled: boolean) => void;
	flushBuffer: () => void;
	clearBuffer: () => void;
};
