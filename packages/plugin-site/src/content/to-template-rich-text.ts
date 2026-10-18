import type { CollectionDocument, Refs } from "@lucidcms/core/types";
import { type RichTextJSON, richTextNodeNames } from "@lucidcms/rich-text";
import isRecord from "../utils/is-record.js";
import type { TemplateBrick } from "./to-template-document.js";
import type { TemplateRelatedDocument } from "./to-template-related-document.js";

/** A rich text node with what it points to resolved; loop over `content` to render nodes yourself. */
export type TemplateRichTextNode = {
	type: string;
	attrs: Record<string, unknown>;
	/** Text nodes only. */
	text?: string;
	/** Formatting on text nodes, such as `bold` or `link`. */
	marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
	content: TemplateRichTextNode[];
	/** `lucidEmbeddedBrick` nodes: the brick, or null when it's missing. */
	brick?: TemplateBrick | null;
	/** `lucidDocument` nodes: the document, or null when the site can't show it. */
	document?: TemplateRelatedDocument | null;
};

/** The document a converted node came from, so `richText()` can render it with the document's refs. */
export type RichTextSource = {
	document: CollectionDocument;
	refs: Refs;
};

export const richTextSources = new WeakMap<object, RichTextSource>();

type Lookups = {
	brick: (ref: string) => TemplateBrick | null;
	document: (
		collectionKey: string,
		id: number,
	) => TemplateRelatedDocument | null;
};

const documentAttrs = (attrs: Record<string, unknown>, lookups: Lookups) =>
	typeof attrs.collectionKey === "string" &&
	typeof attrs.documentId === "number"
		? lookups.document(attrs.collectionKey, attrs.documentId)
		: null;

const toNode = (
	json: RichTextJSON,
	source: RichTextSource,
	lookups: Lookups,
): TemplateRichTextNode => {
	const attrs = json.attrs ?? {};
	const node: TemplateRichTextNode = {
		type: json.type ?? "",
		attrs,
		...(json.text === undefined ? {} : { text: json.text }),
		...(json.marks === undefined ? {} : { marks: json.marks }),
		content: (json.content ?? []).map((child) =>
			toNode(child, source, lookups),
		),
	};

	if (json.type === richTextNodeNames.embeddedBrick) {
		node.brick =
			typeof attrs.ref === "string" ? lookups.brick(attrs.ref) : null;
	}
	if (json.type === richTextNodeNames.document) {
		node.document = documentAttrs(attrs, lookups);
	}

	richTextSources.set(node, source);
	return node;
};

/** Converts a rich text field's JSON, or gives null for an empty field. */
const toTemplateRichText = (
	value: unknown,
	source: RichTextSource,
	lookups: Lookups,
): TemplateRichTextNode | null =>
	isRecord(value) ? toNode(value, source, lookups) : null;

export default toTemplateRichText;
