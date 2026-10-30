import normalizePath from "../utils/normalize-path.js";

/** Matches parameter names, regex constraints and modifiers, with `?` optional, `*` zero or more segments, `+` one or more, and `file-:slug([^\x2f]*)` from an optional parameter sharing text. */
const PARAMETER = /:(\w+)(\((?:[^()]|\([^()]*\))*\))?([?*+]?)/g;

/** Whether a parameter may be left empty: optional and zero-or-more ones, and constraints that match nothing. */
const allowsEmpty = (constraint: string | undefined, modifier: string) => {
	if (modifier === "?" || modifier === "*") return true;
	if (modifier === "+" || constraint === undefined) return false;
	try {
		return new RegExp(`^(?:${constraint.slice(1, -1)})$`).test("");
	} catch {
		return false;
	}
};

const isEmpty = (value: unknown) =>
	value === undefined || value === null || value === "";

/** Fills page patterns from `paths` entries, rejecting missing required values, values other than strings or numbers, `/` in single segments and unknown parameters with errors following the page's name, eg. "gives no value for 'slug'". */
const fillPagePattern = (
	pattern: string,
	values: Record<string, unknown>,
): { error: string; data: undefined } | { error: undefined; data: string } => {
	const names = new Set<string>();
	for (const [, name = "", constraint, modifier = ""] of pattern.matchAll(
		PARAMETER,
	)) {
		names.add(name);
		const value = values[name];
		if (isEmpty(value)) {
			if (allowsEmpty(constraint, modifier)) continue;
			return { error: `gives no value for '${name}'`, data: undefined };
		}
		if (typeof value !== "string" && typeof value !== "number") {
			return {
				error: `gives '${name}' as a ${typeof value}, not a string or number`,
				data: undefined,
			};
		}
		if (modifier !== "*" && modifier !== "+" && String(value).includes("/")) {
			return {
				error: `puts a '/' in '${name}', which is one segment of the path`,
				data: undefined,
			};
		}
	}

	const unknown = Object.keys(values).filter((name) => !names.has(name));
	if (unknown.length > 0) {
		return {
			error: `gives ${unknown.map((name) => `'${name}'`).join(", ")}, which the file name has no parameter for`,
			data: undefined,
		};
	}

	const filled = pattern.replace(PARAMETER, (_, name: string) => {
		const value = values[name];
		return isEmpty(value) ? "" : String(value);
	});
	// Empty optional and catch-all values leave doubled or trailing slashes.
	return {
		error: undefined,
		data: normalizePath(filled.replace(/\/{2,}/g, "/")),
	};
};

export default fillPagePattern;
