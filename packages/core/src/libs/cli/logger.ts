import picocolors from "picocolors";
import { ZodError } from "zod";

const symbols = {
	tick: { icon: "✓", color: picocolors.green },
	cross: { icon: "×", color: picocolors.red },
	warning: { icon: "!", color: picocolors.yellow },
	info: { icon: "i", color: picocolors.blue },
	bullet: { icon: "•", color: picocolors.gray },
	child: { icon: "↳", color: picocolors.gray },
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
	output?: "stdout" | "stderr";
}

const printMessage = (parts: string[], config: PrintConfig) => {
	const {
		symbol,
		indent = 0,
		spaceBefore = false,
		spaceAfter = false,
		defaultSymbol,
		silent = false,
		output = "stdout",
	} = config;

	const print = (message?: string) => {
		if (output === "stderr") console.error(message ?? "");
		else console.log(message ?? "");
	};

	if (spaceBefore && silent !== true) print();

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

	if (silent !== true) print(`${indentStr}${prefix}${message}`);

	if (spaceAfter && silent !== true) print();
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
	const parts = args
		.filter((arg): arg is string => typeof arg === "string")
		.map((part) => picocolors.red(part));

	printMessage(parts, {
		...config,
		defaultSymbol: "cross",
		output: "stderr",
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

const printErrorLine = (
	message: string,
	config: Pick<PrintConfig, "indent" | "symbol">,
) => {
	printMessage([message], {
		...config,
		output: "stderr",
	});
};

const printErrorDetail = (message: string) => {
	const [firstLine = "", ...remainingLines] = message.split("\n");
	printErrorLine(firstLine, { indent: 2, symbol: "child" });

	for (const line of remainingLines) {
		printErrorLine(line, { indent: 4 });
	}
};

const formatZodIssuePath = (path: PropertyKey[]) => {
	return path.reduce<string>((formattedPath, segment) => {
		const value = String(segment);

		if (typeof segment === "number") {
			return `${formattedPath}[${value}]`;
		}
		if (formattedPath.length === 0) {
			return value;
		}
		return `${formattedPath}.${value}`;
	}, "");
};

const errorInstance = (error: Error, heading?: string) => {
	if (error instanceof ZodError) {
		logger.error(heading ?? "Validation Error");

		for (const issue of error.issues) {
			const path = formatZodIssuePath(issue.path);
			printErrorDetail(path ? `${path}: ${issue.message}` : issue.message);
		}
		return;
	}

	logger.error(heading ?? error.name);
	printErrorDetail(error.message);

	if (!error.stack) return;

	const stackLines = error.stack.split("\n").slice(1, 3);
	for (const line of stackLines) {
		printErrorLine(logger.color.gray(line.trim()), { indent: 4 });
	}
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
	errorInstance,
};

export type CLILogger = typeof logger;

export default logger;
