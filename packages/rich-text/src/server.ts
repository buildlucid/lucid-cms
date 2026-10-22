import type { CollectionDocument } from "@lucidcms/types";
import { getSchema } from "@tiptap/core";
import { DOMParser, type ParseOptions } from "@tiptap/pm/model";
import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";
import { parseHTML } from "linkedom";
import { extensions } from "./extensions/index.js";
import { renderRichTextHTML } from "./render.js";
import type { RichTextJSON, RichTextRenderOptions } from "./types.js";
import normalizeInlineStyle from "./utils/normalize-inline-style.js";
import { generatePlainText } from "./utils/text.js";

const parser = DOMParser.fromSchema(getSchema(extensions));

/** Parses HTML with ProseMirror on a lightweight DOM, since server runtimes such as Workers have none. */
const parseRichTextHTML = (
	html: string,
	options?: ParseOptions,
): RichTextJSON => {
	const { document } = parseHTML(
		`<!DOCTYPE html><html><body>${html}</body></html>`,
	);
	for (const element of document.querySelectorAll("[style]")) {
		element.setAttribute(
			"style",
			normalizeInlineStyle(element.getAttribute("style") ?? ""),
		);
	}
	return parser.parse(document.body, options).toJSON();
};

/**
 * Renders rich-text JSON to HTML in server runtimes.
 * Pass the source document and sibling refs to resolve embedded content.
 *
 * @example
 * ```ts
 * const html = generateHTML(richTextValue, {
 *   document,
 *   refs,
 *   renderers: {
 *     paragraph: ({ children }) => `<p class="prose">${children}</p>`,
 *   },
 * });
 * ```
 */
export const generateHTML = <
	TDocument extends CollectionDocument = CollectionDocument,
>(
	json: RichTextJSON,
	options?: RichTextRenderOptions<TDocument>,
): string => renderRichTextHTML(json, options);

/** Serialises rich-text JSON to editable HTML that preserves Lucid node attributes for parsing. */
export const generateSourceHTML = (json: RichTextJSON): string => {
	return renderToHTMLString({ extensions, content: json });
};

/** Parses editable source HTML into rich-text JSON, preserving spaces while normalizing formatting line breaks. */
export const parseSourceHTML = (html: string): RichTextJSON => {
	const formatted = html
		.replace(/>[ \t]*[\r\n][ \t\r\n]*/g, ">")
		.replace(/[ \t]*[\r\n][ \t\r\n]*</g, "<")
		.replace(/[ \t]*[\r\n][ \t\r\n]*/g, " ");
	return parseRichTextHTML(formatted, { preserveWhitespace: true });
};

/** Parses HTML into Lucid rich-text JSON in server runtimes. */
export const generateJSON = (html: string): RichTextJSON => {
	return parseRichTextHTML(html);
};

/** Extracts readable plain text from rich-text JSON in server runtimes. */
export const generateText = (json: RichTextJSON): string => {
	return generatePlainText(json);
};
