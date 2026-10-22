/** CSS values made only of keywords and numbers, such as `bold` or `700`, which browsers compare case-insensitively. */
const keywordValue = /^[a-z0-9\s-]+$/i;

/** Normalises inline styles for ProseMirror marks such as bold, lowercasing property names and keywords and removing `!important` because linkedom returns raw attribute text. */
const normalizeInlineStyle = (style: string) =>
	style
		.split(";")
		.flatMap((declaration) => {
			const separator = declaration.indexOf(":");
			if (separator === -1) return [];
			const property = declaration.slice(0, separator).trim().toLowerCase();
			const value = declaration
				.slice(separator + 1)
				.replace(/!\s*important\s*$/i, "")
				.trim();
			if (!property || !value) return [];
			return `${property}: ${keywordValue.test(value) ? value.toLowerCase() : value}`;
		})
		.join("; ");

export default normalizeInlineStyle;
