import type { RichTextJSON } from "@lucidcms/rich-text";
import { generateHTML } from "@lucidcms/rich-text/server";
import { type Markup, safe } from "@lucidkiln/core";
import {
	richTextSources,
	type TemplateRichTextNode,
} from "../content/to-template-rich-text.js";
import isRecord from "../utils/is-record.js";

/** Rebuilds editor JSON from a converted node, which may be a copy, such as one an island received. */
const toJSON = (node: TemplateRichTextNode): RichTextJSON => ({
	type: node.type,
	attrs: node.attrs,
	...(node.text === undefined ? {} : { text: node.text }),
	...(node.marks === undefined ? {} : { marks: node.marks }),
	content: node.content.map(toJSON),
});

/** Renders rich text fields or nodes as HTML; loop over `content` to render omitted embedded bricks and document nodes with templates, passing other nodes here. */
const richText = (
	node: TemplateRichTextNode | RichTextJSON | null | undefined,
): Markup => {
	if (!isRecord(node)) return safe("");

	const source = richTextSources.get(node);
	if (!source) return safe(generateHTML(node));

	return safe(
		generateHTML(toJSON(node as TemplateRichTextNode), {
			document: source.document,
			refs: source.refs,
		}),
	);
};

export default richText;
