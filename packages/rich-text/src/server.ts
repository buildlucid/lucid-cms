import type { CollectionDocument } from "@lucidcms/types";
import {
	generateHTML as tiptapGenerateHTML,
	generateJSON as tiptapGenerateJSON,
} from "@tiptap/html/server";
import { extensions } from "./extensions/index.js";
import { renderRichTextHTML } from "./render.js";
import type { RichTextJSON, RichTextRenderOptions } from "./types.js";
import { generatePlainText } from "./utils/text.js";

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
	return tiptapGenerateHTML(json, extensions);
};

/** Parses editable source HTML into rich-text JSON, preserving spaces while normalizing formatting line breaks. */
export const parseSourceHTML = (html: string): RichTextJSON => {
	const formatted = html
		.replace(/>[ \t]*[\r\n][ \t\r\n]*/g, ">")
		.replace(/[ \t]*[\r\n][ \t\r\n]*</g, "<")
		.replace(/[ \t]*[\r\n][ \t\r\n]*/g, " ");
	return tiptapGenerateJSON(formatted, extensions, {
		preserveWhitespace: true,
	});
};

/** Parses HTML into Lucid rich-text JSON in server runtimes. */
export const generateJSON = (html: string): RichTextJSON => {
	return tiptapGenerateJSON(html, extensions);
};

/** Extracts readable plain text from rich-text JSON in server runtimes. */
export const generateText = (json: RichTextJSON): string => {
	return generatePlainText(json);
};
