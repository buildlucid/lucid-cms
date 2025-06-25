export const colours = {
	bgBlue: "\x1b[44m",
	bgYellow: "\x1b[43m",
	bgGreen: "\x1b[42m",
	bgRed: "\x1b[41m",
	textBlue: "\x1b[34m",
	textYellow: "\x1b[33m",
	textGreen: "\x1b[32m",
	textRed: "\x1b[31m",
	textLimeGreen: "\x1b[92m",
	bgLimeGreen: "\x1b[102m",
	textGray: "\x1b[90m",
	reset: "\x1b[0m",
	bold: "\x1b[1m",
} as const;

export const formatBadge = (text: string, bg: string, textColour: string) =>
	`${bg}${textColour}${colours.bold} ${text} ${colours.reset}`;

export const formatDuration = (milliseconds: number): string => {
	if (milliseconds < 1000) {
		return `${Math.round(milliseconds)}ms`;
	}
	return `${(milliseconds / 1000).toFixed(2)}s`;
};

export const formatFileSize = (bytes: number): string => {
	const mb = bytes / 1024 / 1024;
	return `${mb.toFixed(2)}MB`;
};

export const divider = `${colours.textGray}${"─".repeat(70)}${colours.reset}`;
