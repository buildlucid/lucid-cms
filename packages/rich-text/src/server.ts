import type { JSONContent } from "@tiptap/core";
import {
	generateHTML as tiptapGenerateHTML,
	generateJSON as tiptapGenerateJSON,
} from "@tiptap/html";
import { extensions } from "./extensions.js";
import type { RichTextJSON } from "./types.js";

export const generateHTML = (json: RichTextJSON): string => {
	return tiptapGenerateHTML(json as JSONContent, extensions);
};

export const generateJSON = (html: string): RichTextJSON => {
	return tiptapGenerateJSON(html, extensions) as RichTextJSON;
};
