/**
 * Escapes text for use as a regular expression that matches it literally. Unlike
 * `RegExp.escape`, spaces stay as they are, so a pattern stays readable in a command.
 */
const escapePattern = (text: string): string =>
	text.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default escapePattern;
