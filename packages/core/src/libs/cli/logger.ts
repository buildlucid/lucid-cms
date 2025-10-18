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
	const bg = backgroundColor ?? picocolors.bgBlue;
	const fg = foregroundColor ?? picocolors.white;

	return bg(fg(` ${text} `));
};

export const logger = {
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
};
