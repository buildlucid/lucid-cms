import normalizePathValue from "./normalize-path-value.js";

/** Joins normalized path parts with a leading slash, preserving `/` and returning null for empty input. */
const formatFullSlug = (
	...parts: Array<string | null | undefined>
): string | null => {
	const hasRoot = parts.some((part) => part === "/");
	const normalizedParts = parts
		.map((part) => normalizePathValue(part))
		.filter((part): part is string => part !== null && part !== undefined)
		.map((part) => {
			if (part === "/") return "";
			return part.replace(/^\/+|\/+$/g, "");
		})
		.filter(Boolean);

	if (normalizedParts.length === 0) {
		return hasRoot ? "/" : null;
	}

	return `/${normalizedParts.join("/")}`.replace(/\/+/g, "/");
};

export default formatFullSlug;
