import { generateJSON as tiptapGenerateJSON } from "@tiptap/html/server";
import { extensions } from "./extensions.js";
import { renderRichTextHTML } from "./render.js";
import type { RichTextJSON, RichTextRenderOptions } from "./types.js";
import { generatePlainText } from "./utils/text.js";

/** Renders rich-text JSON to HTML in server runtimes. */
export const generateHTML = (
	json: RichTextJSON,
	options?: RichTextRenderOptions,
): string => renderRichTextHTML(json, options);

/** Parses HTML into Lucid rich-text JSON in server runtimes. */
export const generateJSON = (html: string): RichTextJSON => {
	return tiptapGenerateJSON(html, extensions);
};

/** Extracts readable plain text from rich-text JSON in server runtimes. */
export const generateText = (json: RichTextJSON): string => {
	return generatePlainText(json);
};
