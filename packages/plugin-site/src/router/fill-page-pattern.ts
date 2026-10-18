import normalizePath from "../utils/normalize-path.js";

/** Matches parameter names, regex constraints and modifiers, with `?` optional, `*` zero or more segments, `+` one or more, and `file-:slug(.*)` from an optional parameter sharing text. */
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

/** Fills a page pattern from a `paths` entry, rejecting missing required values, values other than strings or numbers, `/` in single segments and unknown parameters. */
const fillPagePattern = (
	pattern: string,
	values: Record<string, unknown>,
): string => {
	const names = new Set<string>();
	const filled = pattern.replace(
		PARAMETER,
		(_, name: string, constraint: string | undefined, modifier: string) => {
			names.add(name);
			const value = values[name];
			if (value === undefined || value === null || value === "") {
				if (allowsEmpty(constraint, modifier)) return "";
				throw new Error(`gives no value for '${name}'`);
			}
			if (typeof value !== "string" && typeof value !== "number") {
				throw new Error(
					`gives '${name}' as a ${typeof value}, not a string or number`,
				);
			}
			const text = String(value);
			if (modifier !== "*" && modifier !== "+" && text.includes("/")) {
				throw new Error(
					`puts a '/' in '${name}', which is one segment of the path`,
				);
			}
			return text;
		},
	);

	const unknown = Object.keys(values).filter((name) => !names.has(name));
	if (unknown.length > 0) {
		throw new Error(
			`gives ${unknown.map((name) => `'${name}'`).join(", ")}, which the file name has no parameter for`,
		);
	}
	// Empty optional and catch-all values leave doubled or trailing slashes.
	return normalizePath(filled.replace(/\/{2,}/g, "/"));
};

export default fillPagePattern;
