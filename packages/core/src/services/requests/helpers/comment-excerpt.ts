import type { RichTextJSON } from "@lucidcms/richtext";
import { generateText } from "@lucidcms/richtext/server";

/** The first line or so of a comment, for notification bodies. */
const commentExcerpt = (body: RichTextJSON) => {
	const text = generateText(body).replace(/\s+/g, " ").trim();
	return text.length > 160 ? `${text.slice(0, 157)}...` : text;
};

export default commentExcerpt;
