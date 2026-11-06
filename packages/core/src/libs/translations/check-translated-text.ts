import type { TranslationText } from "../collection/custom-fields/types.js";

const tagPattern = /<\s*(\/?)\s*([a-zA-Z][\w:-]*)([^>]*)>/g;
const attributePattern =
	/([^\s=/"'>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

/** The tags in HTML with their attributes, sorted, so translated HTML can be checked against its source in any order. */
const listTags = (html: string): string[] =>
	[...html.matchAll(tagPattern)]
		.map(([, closing, name, attributes]) => {
			const pairs = [...(attributes ?? "").matchAll(attributePattern)]
				.map(
					([, attribute, double, single, bare]) =>
						`${attribute?.toLowerCase()}=${double ?? single ?? bare ?? ""}`,
				)
				.toSorted();
			return `${closing}${name?.toLowerCase()} ${pairs.join(" ")}`;
		})
		.toSorted();

/**
 * Why translated text can't replace a translation, or null when it can. It
 * needs some text, and HTML needs the same tags and attributes as its source
 * so links, marks and embedded content survive.
 */
const checkTranslatedText = (
	source: TranslationText,
	translated: string,
): "empty" | "markup" | null => {
	if (translated.trim() === "") return "empty";
	if (source.format !== "html") return null;

	const expected = listTags(source.text);
	const received = listTags(translated);
	if (
		expected.length !== received.length ||
		expected.some((tag, index) => tag !== received[index])
	) {
		return "markup";
	}
	return null;
};

export default checkTranslatedText;
