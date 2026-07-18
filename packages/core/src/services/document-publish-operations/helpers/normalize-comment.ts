import type { RichTextJSON } from "@lucidcms/rich-text";
import { generateHTML, generateText } from "@lucidcms/rich-text/server";

const normalizeComment = (comment?: RichTextJSON | null) => {
	if (!comment) {
		return {
			value: null,
			text: null,
			html: null,
		};
	}

	const text = generateText(comment).trim();
	if (!text) {
		return {
			value: null,
			text: null,
			html: null,
		};
	}

	return {
		value: comment,
		text,
		html: generateHTML(comment),
	};
};

export default normalizeComment;
