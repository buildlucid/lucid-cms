import type { RichTextJSON } from "@lucidcms/richtext";
import { generateText } from "@lucidcms/richtext/browser";

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
