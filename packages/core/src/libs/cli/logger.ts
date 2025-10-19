import picocolors from "picocolors";

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
	} = config;

	if (spaceBefore) console.log();

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

	console.log(`${indentStr}${prefix}${message}`);

	if (spaceAfter) console.log();
};

const isConfig = (arg: unknown): arg is LogConfig => {
	return (
		typeof arg === "object" &&
		arg !== null &&
		("symbol" in arg ||
			"indent" in arg ||
			"spaceBefore" in arg ||
			"spaceAfter" in arg)
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

const errorInstance = (error: Error) => {
	const lines = [
		`${logger.color.red(logger.color.bold(error.name))}: ${error.message}`,
		"",
	];

	if (error.stack) {
		const stackLines = error.stack.split("\n").slice(1, 4); // First 3 stack frames
		lines.push(...stackLines.map((line) => logger.color.gray(line.trim())));
	}

	const maxLength = Math.max(...lines.map((l) => l.length));
	const width = Math.min(maxLength + 4, 80);

	console.log();
	console.log(logger.color.red(`╭${"─".repeat(width - 2)}╮`));

	for (const line of lines) {
		const padding = " ".repeat(width - line.length - 4);
		console.log(
			`${logger.color.red("│")}  ${line}${padding} ${logger.color.red("│")}`,
		);
	}

	console.log(logger.color.red(`╰${"─".repeat(width - 2)}╯`));
	console.log();
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
