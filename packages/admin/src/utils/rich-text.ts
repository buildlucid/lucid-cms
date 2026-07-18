import type { RichTextJSON } from "@lucidcms/rich-text";
import { generateText } from "@lucidcms/rich-text/browser";

export const reviewCommentRichTextOptions = {
	headings: false,
	underline: false,
	strikethrough: false,
} as const;

export const createEmptyRichTextValue = (): RichTextJSON => ({
	type: "doc",
	content: [{ type: "paragraph" }],
});

export const getRichTextPlainText = (value?: RichTextJSON | null): string => {
	if (!value) return "";

	try {
		return generateText(value).trim();
	} catch {
		return "";
	}
};

export const getRichTextSummary = (value?: RichTextJSON | null): string =>
	getRichTextPlainText(value).replace(/\s+/g, " ");
