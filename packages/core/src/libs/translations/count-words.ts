import type { TranslationText } from "../collection/custom-fields/types.js";

/** Counts the words in translation text, leaving out HTML tags. */
const countWords = (text: TranslationText): number =>
	(text.format === "html" ? text.text.replace(/<[^>]*>/g, " ") : text.text)
		.split(/\s+/)
		.filter(Boolean).length;

export default countWords;
