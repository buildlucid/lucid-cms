import type { JSONContent } from "@tiptap/core";
import { generateHTML, generateJSON } from "@tiptap/core";
import { extensions } from "./extensions.js";
import type { RichTextJSON } from "./types.js";

export const toHTML = (json: RichTextJSON): string => {
	return generateHTML(json as JSONContent, extensions);
};

export const toJSON = (html: string): RichTextJSON => {
	return generateJSON(html, extensions) as RichTextJSON;
};
