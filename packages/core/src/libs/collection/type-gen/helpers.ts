const identifierPattern = /[A-Za-z0-9]+/g;

export const stringLiteral = (value: string): string => JSON.stringify(value);

export const toPascalCaseIdentifier = (
	value: string,
	fallback: string,
): string => {
	const words =
		value.match(identifierPattern)?.map((word) => {
			return word.charAt(0).toUpperCase() + word.slice(1);
		}) ?? [];

	const identifier = words.join("") || fallback;

	return /^[0-9]/.test(identifier) ? `_${identifier}` : identifier;
};

export const indentBlock = (value: string, depth = 1): string => {
	const prefix = "\t".repeat(depth);

	return value
		.split("\n")
		.map((line) => (line.length > 0 ? `${prefix}${line}` : line))
		.join("\n");
};

export const dedupeStrings = (values: string[]): string[] => {
	return Array.from(new Set(values));
};
