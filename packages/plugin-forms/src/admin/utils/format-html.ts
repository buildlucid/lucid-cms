const voidTags = new Set(["input", "br", "hr", "img", "meta", "link"]);
const inlineTags = new Set(["span", "strong", "em", "b", "i", "abbr"]);

const tagName = (tag: string) => /^<\/?([a-z0-9-]+)/i.exec(tag)?.[1] ?? "";

/** Where the element opened at `start` closes, or -1 when it holds anything but text and inline tags. */
const inlineEnd = (tokens: string[], start: number): number => {
	let depth = 0;
	for (let index = start + 1; index < tokens.length; index++) {
		const token = tokens[index] ?? "";
		if (!token.startsWith("<")) continue;
		if (token.startsWith("</")) {
			if (depth === 0) return index;
			depth -= 1;
			continue;
		}
		if (!inlineTags.has(tagName(token))) return -1;
		depth += 1;
	}
	return -1;
};

/**
 * Puts each element of a line of HTML on a line of its own, indented by its depth, for people to
 * read. An element holding only text and inline tags, such as a label, stays on one line.
 */
const formatHtml = (html: string): string => {
	const tokens = html.match(/<[^>]+>|[^<]+/g) ?? [];
	const lines: string[] = [];
	let depth = 0;

	for (let index = 0; index < tokens.length; index++) {
		const token = tokens[index] ?? "";
		const indent = "\t".repeat(depth);

		if (token.startsWith("</")) {
			depth = Math.max(0, depth - 1);
			lines.push(`${"\t".repeat(depth)}${token}`);
			continue;
		}
		if (!token.startsWith("<")) {
			if (token.trim() !== "") lines.push(`${indent}${token.trim()}`);
			continue;
		}
		if (voidTags.has(tagName(token))) {
			lines.push(`${indent}${token}`);
			continue;
		}

		const end = inlineEnd(tokens, index);
		if (end !== -1) {
			lines.push(`${indent}${tokens.slice(index, end + 1).join("")}`);
			index = end;
			continue;
		}

		lines.push(`${indent}${token}`);
		depth += 1;
	}

	return lines.join("\n");
};

export default formatHtml;
