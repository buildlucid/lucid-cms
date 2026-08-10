import type { RichTextJSON } from "@lucidcms/rich-text";

/** Removes response-only render values without changing reference identities. */
const normalizeRichTextValue = (node: RichTextJSON): RichTextJSON => {
	const attrs = { ...node.attrs };

	if (node.type === "lucidMedia") delete attrs.media;
	if (node.type === "lucidVariable") delete attrs.value;

	return {
		...node,
		...(node.attrs ? { attrs } : {}),
		...(node.content
			? { content: node.content.map(normalizeRichTextValue) }
			: {}),
		...(node.marks
			? {
					marks: node.marks.map((mark) => {
						if (mark.type !== "link" || mark.attrs?.kind !== "document") {
							return mark;
						}

						const markAttrs = { ...mark.attrs };
						delete markAttrs.href;
						return { ...mark, attrs: markAttrs };
					}),
				}
			: {}),
	};
};

export default normalizeRichTextValue;
