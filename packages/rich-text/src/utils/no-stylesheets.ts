/** Replaces linkedom's unused stylesheet parser to prevent its direct `eval` from blocking variable renaming in a Worker bundle. */
export const parse = (): never => {
	throw new Error("Lucid's rich-text DOM does not parse stylesheets.");
};
