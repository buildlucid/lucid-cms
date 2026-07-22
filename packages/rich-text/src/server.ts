import type { JSONContent } from "@tiptap/core";
import { generateText as tiptapGenerateText } from "@tiptap/core";
import { generateJSON as tiptapGenerateJSON } from "@tiptap/html/server";
import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";
import { extensions } from "./extensions.js";
import type { RichTextJSON } from "./types.js";
import { generatePlainText } from "./utils/text.js";

export const generateHTML = (json: RichTextJSON): string => {
	return renderToHTMLString({
		content: json as JSONContent,
		extensions,
	});
};

export const generateJSON = (html: string): RichTextJSON => {
	return tiptapGenerateJSON(html, extensions) as RichTextJSON;
};

export const generateText = (json: RichTextJSON): string => {
	tiptapGenerateText(json as JSONContent, extensions);
	return generatePlainText(json);
};
