import type { Extensions, JSONContent } from "@tiptap/core";
import {
	generateHTML as tiptapGenerateHTML,
	generateJSON as tiptapGenerateJSON,
	generateText as tiptapGenerateText,
} from "@tiptap/core";
import { extensions, mergeExtensions } from "./extensions.js";
import type { RichTextJSON } from "./types.js";
import { generatePlainText } from "./utils/text.js";

export const generateHTML = (
	json: RichTextJSON,
	props?: {
		extensions?: Extensions;
	},
): string => {
	return tiptapGenerateHTML(
		json as JSONContent,
		mergeExtensions(props?.extensions),
	);
};

export const generateJSON = (html: string): RichTextJSON => {
	return tiptapGenerateJSON(html, extensions) as RichTextJSON;
};

export const generateText = (json: RichTextJSON): string => {
	tiptapGenerateText(json as JSONContent, extensions);
	return generatePlainText(json);
};
