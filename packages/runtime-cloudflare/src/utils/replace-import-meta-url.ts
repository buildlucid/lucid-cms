type Node = { type: string; start: number; end: number };

const isNode = (value: unknown): value is Node & Record<string, unknown> =>
	typeof value === "object" &&
	value !== null &&
	typeof (value as { type?: unknown }).type === "string";

const isImportMetaUrl = (node: Record<string, unknown>) => {
	const { object, property } = node;
	return (
		node.type === "MemberExpression" &&
		node.computed === false &&
		isNode(object) &&
		object.type === "MetaProperty" &&
		(object.meta as { name?: unknown } | undefined)?.name === "import" &&
		(object.property as { name?: unknown } | undefined)?.name === "meta" &&
		isNode(property) &&
		property.name === "url"
	);
};

/** Replaces `import.meta.url` expressions found in the ESTree `ast` with `value`, preserving string literals in `code`. */
const replaceImportMetaUrl = (code: string, ast: unknown, value: string) => {
	const spans: Node[] = [];
	// A stack rather than recursion, since bundled code can nest deeper than the call stack allows.
	const stack: unknown[] = [ast];
	while (stack.length > 0) {
		const item = stack.pop();
		if (Array.isArray(item)) stack.push(...item);
		else if (isNode(item)) {
			if (isImportMetaUrl(item)) spans.push(item);
			else stack.push(...Object.values(item));
		}
	}
	spans.sort((a, b) => a.start - b.start);
	let result = "";
	let at = 0;
	for (const span of spans) {
		result += code.slice(at, span.start) + value;
		at = span.end;
	}
	return result + code.slice(at);
};

export default replaceImportMetaUrl;
