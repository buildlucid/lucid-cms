import boxen from "boxen";
import picocolors from "picocolors";
import { ZodError } from "zod/v4";
import tidyZodError from "../../utils/errors/tidy-zod-errors.js";

const symbols = {
	tick: { icon: "✓", color: picocolors.green },
	cross: { icon: "×", color: picocolors.red },
	warning: { icon: "!", color: picocolors.yellow },
	info: { icon: "i", color: picocolors.blue },
	bullet: { icon: "•", color: picocolors.gray },
	line: { icon: "┃", color: picocolors.gray },
	halfCircle: { icon: "◐", color: picocolors.yellow },
} as const;

type SymbolKey = keyof typeof symbols;

interface LogConfig {
	symbol?: SymbolKey | string;
	indent?: number;
	spaceBefore?: boolean;
	spaceAfter?: boolean;
	silent?: boolean;
}

interface PrintConfig extends LogConfig {
	defaultSymbol?: SymbolKey;
}

const printMessage = (parts: string[], config: PrintConfig) => {
	const {
		symbol,
		indent = 0,
		spaceBefore = false,
		spaceAfter = false,
		defaultSymbol,
		silent = false,
	} = config;

	if (spaceBefore && silent !== true) console.log();

	const indentStr = " ".repeat(indent);

	const resolvedSymbol = symbol
		? (symbols[symbol as SymbolKey] ?? {
				icon: symbol,
				color: (s: string) => s,
			})
		: defaultSymbol
			? symbols[defaultSymbol]
			: undefined;

	const prefix = resolvedSymbol
		? `${resolvedSymbol.color(resolvedSymbol.icon)} `
		: "";

	const message = parts.join(" ");

	if (silent !== true) console.log(`${indentStr}${prefix}${message}`);

	if (spaceAfter && silent !== true) console.log();
};

const isConfig = (arg: unknown): arg is LogConfig => {
	return (
		typeof arg === "object" &&
		arg !== null &&
		("symbol" in arg ||
			"indent" in arg ||
			"spaceBefore" in arg ||
			"spaceAfter" in arg ||
			"silent" in arg)
	);
};

const info = (...args: Array<string | LogConfig>) => {
	const config = args.find(isConfig) ?? {};
	const parts = args.filter((arg): arg is string => typeof arg === "string");

	printMessage(parts, {
		...config,
		defaultSymbol: "info",
	});
};

const error = (...args: Array<string | LogConfig>) => {
	const config = args.find(isConfig) ?? {};
	const parts = args.filter((arg): arg is string => typeof arg === "string");

	printMessage(parts, {
		...config,
		defaultSymbol: "cross",
	});
};

const warn = (...args: Array<string | LogConfig>) => {
	const config = args.find(isConfig) ?? {};
	const parts = args.filter((arg): arg is string => typeof arg === "string");

	printMessage(parts, {
		...config,
		defaultSymbol: "warning",
	});
};

const log = (...args: Array<string | LogConfig>) => {
	const config = args.find(isConfig) ?? {};
	const parts = args.filter((arg): arg is string => typeof arg === "string");

	printMessage(parts, {
		...config,
	});
};

const success = (...args: Array<string | LogConfig>) => {
	const config = args.find(isConfig) ?? {};
	const parts = args.filter((arg): arg is string => typeof arg === "string");

	printMessage(parts, {
		...config,
		defaultSymbol: "tick",
	});
};

const formatMilliseconds = (milliseconds: number): string => {
	if (milliseconds < 1000) {
		return `${Math.round(milliseconds)}ms`;
	}
	return `${(milliseconds / 1000).toFixed(2)}s`;
};

const startTimer = () => {
	const start = process.hrtime.bigint();

	return () => {
		const end = process.hrtime.bigint();
		const diff = Number(end - start);
		return diff / 1_000_000;
	};
};

const createBadge = (
	text: string,
	backgroundColor?: (str: string) => string,
	foregroundColor?: (str: string) => string,
): string => {
	const bg = backgroundColor ?? picocolors.bgGreenBright;
	const fg = foregroundColor ?? picocolors.black;

	return bg(fg(` ${text} `));
};

const formatBytes = (bytes: number): string => {
	if (bytes === 0) return "0 B";

	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
};

const formatZodError = (error: ZodError) => {
	const message = tidyZodError(error).trim();
	return boxen(message, {
		padding: 1,
		margin: 1,
		borderColor: "red",
		borderStyle: "round",
		title: "Validation Error",
	});
};

const errorInstance = (error: Error) => {
	if (error instanceof ZodError) {
		console.log(formatZodError(error));
		return;
	}

	const lines = [error.message];

	if (error.stack) {
		const stackLines = error.stack.split("\n").slice(1, 3);
		lines.push("", ...stackLines.map((line) => logger.color.gray(line.trim())));
	}

	console.log(
		boxen(lines.join("\n"), {
			padding: 1,
			margin: 1,
			borderColor: "red",
			borderStyle: "round",
			title: error.name,
		}),
	);
};

const logger = {
	info,
	error,
	warn,
	log,
	success,
	color: picocolors,
	symbols,
	formatMilliseconds,
	startTimer,
	createBadge,
	formatBytes,
	formatZodError,
	errorInstance,
};

export type CLILogger = typeof logger;

export default logger;
