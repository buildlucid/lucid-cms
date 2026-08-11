import type { CollectionDocument, DocumentRef } from "@lucidcms/types";
import type {
	Mark as ProseMirrorMark,
	Node as ProseMirrorNode,
} from "@tiptap/pm/model";
import type { MarkProps, NodeProps } from "@tiptap/static-renderer";
import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";
import { mergeExtensions } from "./extensions/index.js";
import { renderLinkMark } from "./extensions/link/render.js";
import { renderMediaNode } from "./extensions/media/render.js";
import { renderVariableNode } from "./extensions/variable/render.js";
import {
	type RichTextElement,
	type RichTextElementRenderer,
	type RichTextHydratedMedia,
	type RichTextJSON,
	type RichTextRenderBrick,
	type RichTextRenderDocument,
	type RichTextRenderMark,
	type RichTextRenderOptions,
	richTextNodeNames,
} from "./types.js";
import {
	childrenToHTML,
	renderDefaultMark,
	renderDefaultNode,
	renderWithCallback,
} from "./utils/render-helpers.js";

type NodeRenderer = (
	props: NodeProps<ProseMirrorNode, string | string[]>,
) => string;
type MarkRenderer = (
	props: MarkProps<ProseMirrorMark, string | string[], ProseMirrorNode>,
) => string;

const scalarValue = (value: unknown): string | number | boolean | null =>
	typeof value === "string" ||
	typeof value === "number" ||
	typeof value === "boolean"
		? value
		: null;

const isDocumentReference = (value: unknown): value is DocumentRef =>
	typeof value === "object" &&
	value !== null &&
	"collectionKey" in value &&
	typeof value.collectionKey === "string" &&
	"id" in value &&
	typeof value.id === "number";

/**
 * Resolves a document node from the source document without duplicating the
 * referenced document in the rich-text JSON. The source document wins when a
 * node points to itself; other nodes resolve from its relation refs.
 */
const resolveDocumentNodeTarget = <TDocument extends CollectionDocument>(
	sourceDocument: TDocument | null,
	collectionKey: unknown,
	documentId: unknown,
): RichTextRenderDocument<TDocument> | null => {
	if (typeof collectionKey !== "string" || typeof documentId !== "number") {
		return null;
	}

	if (
		sourceDocument?.collectionKey === collectionKey &&
		sourceDocument.id === documentId
	) {
		return sourceDocument;
	}

	for (const reference of sourceDocument?.refs?.relation ?? []) {
		if (
			isDocumentReference(reference) &&
			reference.collectionKey === collectionKey &&
			reference.id === documentId
		) {
			return reference;
		}
	}

	return null;
};

/** Builds the node and mark mappings used by the static HTML renderer. */
const createRenderMappings = <
	TDocument extends CollectionDocument = CollectionDocument,
>(props: {
	options?: RichTextRenderOptions<TDocument>;
	extensionNames: { nodes: string[]; marks: string[] };
}) => {
	const renderers = props.options?.renderers;
	const sourceDocument = props.options?.document ?? null;
	const embeddedBricks = new Map<string, RichTextRenderBrick<TDocument>>();
	for (const brick of sourceDocument?.bricks ?? []) {
		embeddedBricks.set(brick.ref, brick);
	}
	const nodeMapping: Record<string, NodeRenderer> = {};
	const markMapping: Record<string, MarkRenderer> = {};

	const addNode = <Element extends RichTextElement>(
		name: string,
		element: Element,
		renderer: RichTextElementRenderer<Element> | undefined,
	) => {
		if (!renderer && !renderers?.fallback) return;
		nodeMapping[name] = ({ node, children }) => {
			const nodeJSON = node.toJSON() as RichTextJSON;
			const childHTML = childrenToHTML(children);
			return renderWithCallback({
				renderer,
				fallback: renderers?.fallback,
				rendererProps: {
					element,
					node: nodeJSON,
					children: childHTML,
					defaultHTML: renderDefaultNode({
						element,
						node: nodeJSON,
						children: childHTML,
					}),
				},
			});
		};
	};

	addNode("doc", "root", renderers?.root);
	addNode("paragraph", "paragraph", renderers?.paragraph);
	if (
		renderers?.h1 ||
		renderers?.h2 ||
		renderers?.h3 ||
		renderers?.h4 ||
		renderers?.h5 ||
		renderers?.h6 ||
		renderers?.fallback
	) {
		nodeMapping.heading = ({ node, children }) => {
			const level = typeof node.attrs.level === "number" ? node.attrs.level : 1;
			const element = `h${Math.min(Math.max(level, 1), 6)}` as
				| "h1"
				| "h2"
				| "h3"
				| "h4"
				| "h5"
				| "h6";
			const nodeJSON = node.toJSON() as RichTextJSON;
			const childHTML = childrenToHTML(children);
			//* The runtime heading level selects the callback with the matching
			//* literal element type.
			const renderer = renderers?.[element] as
				| RichTextElementRenderer<typeof element>
				| undefined;
			return renderWithCallback({
				renderer,
				fallback: renderers?.fallback,
				rendererProps: {
					element,
					node: nodeJSON,
					children: childHTML,
					defaultHTML: renderDefaultNode({
						element,
						node: nodeJSON,
						children: childHTML,
					}),
				},
			});
		};
	}
	addNode("blockquote", "blockquote", renderers?.blockquote);
	addNode("bulletList", "bulletList", renderers?.bulletList);
	addNode("orderedList", "orderedList", renderers?.orderedList);
	addNode("listItem", "listItem", renderers?.listItem);
	addNode("codeBlock", "codeBlock", renderers?.codeBlock);
	addNode("hardBreak", "hardBreak", renderers?.hardBreak);
	addNode("horizontalRule", "horizontalRule", renderers?.horizontalRule);
	addNode("text", "text", renderers?.text);

	nodeMapping[richTextNodeNames.document] = ({ node, children }) => {
		const nodeJSON = node.toJSON() as RichTextJSON;
		const document = resolveDocumentNodeTarget(
			sourceDocument,
			node.attrs.collectionKey,
			node.attrs.documentId,
		);
		return renderWithCallback({
			renderer: renderers?.document,
			fallback: renderers?.fallback,
			rendererProps: {
				element: "document",
				node: nodeJSON,
				children: childrenToHTML(children),
				defaultHTML: "",
				document,
			},
		});
	};
	nodeMapping[richTextNodeNames.media] = ({ node, children }) => {
		const nodeJSON = node.toJSON() as RichTextJSON;
		const media = (node.attrs.media as RichTextHydratedMedia | null) ?? null;
		return renderWithCallback({
			renderer: renderers?.media,
			fallback: renderers?.fallback,
			rendererProps: {
				element: "media",
				node: nodeJSON,
				children: childrenToHTML(children),
				defaultHTML: renderMediaNode(media),
				media,
			},
		});
	};
	nodeMapping[richTextNodeNames.variable] = ({ node, children }) => {
		const nodeJSON = node.toJSON() as RichTextJSON;
		const value = scalarValue(node.attrs.value);
		return renderWithCallback({
			renderer: renderers?.variable,
			fallback: renderers?.fallback,
			rendererProps: {
				element: "variable",
				node: nodeJSON,
				children: childrenToHTML(children),
				defaultHTML: renderVariableNode(value),
				value,
			},
		});
	};
	nodeMapping[richTextNodeNames.embeddedBrick] = ({ node, children }) => {
		const nodeJSON = node.toJSON() as RichTextJSON;
		const ref = node.attrs.ref;
		const brick =
			typeof ref === "string" ? (embeddedBricks.get(ref) ?? null) : null;
		return renderWithCallback({
			renderer: renderers?.brick,
			fallback: renderers?.fallback,
			rendererProps: {
				element: "brick",
				node: nodeJSON,
				children: childrenToHTML(children),
				defaultHTML: "",
				brick,
			},
		});
	};

	const addMark = <Element extends RichTextElement>(
		name: string,
		element: Element,
		renderer: RichTextElementRenderer<Element> | undefined,
	) => {
		if (!renderer && !renderers?.fallback) return;
		markMapping[name] = ({ mark, node, children }) => {
			const childHTML = childrenToHTML(children);
			return renderWithCallback({
				renderer,
				fallback: renderers?.fallback,
				rendererProps: {
					element,
					node: node.toJSON() as RichTextJSON,
					mark: mark.toJSON() as RichTextRenderMark,
					children: childHTML,
					defaultHTML: renderDefaultMark({ element, children: childHTML }),
				},
			});
		};
	};

	addMark("bold", "bold", renderers?.bold);
	addMark("italic", "italic", renderers?.italic);
	addMark("strike", "strike", renderers?.strike);
	addMark("underline", "underline", renderers?.underline);
	addMark("code", "code", renderers?.code);
	markMapping.link = ({ mark, node, children }) => {
		const childHTML = childrenToHTML(children);
		return renderWithCallback({
			renderer: renderers?.link,
			fallback: renderers?.fallback,
			rendererProps: {
				element: "link",
				node: node.toJSON() as RichTextJSON,
				mark: mark.toJSON() as RichTextRenderMark,
				children: childHTML,
				defaultHTML: renderLinkMark({
					attrs: mark.attrs,
					children: childHTML,
				}),
			},
		});
	};

	if (renderers?.fallback) {
		for (const name of props.extensionNames.nodes) {
			if (nodeMapping[name]) continue;
			nodeMapping[name] = ({ node, children }) => {
				const nodeJSON = node.toJSON() as RichTextJSON;
				const childHTML = childrenToHTML(children);
				return (
					renderers.fallback?.({
						element: name,
						node: nodeJSON,
						children: childHTML,
						defaultHTML: "",
					}) ?? ""
				);
			};
		}
		for (const name of props.extensionNames.marks) {
			if (markMapping[name]) continue;
			markMapping[name] = ({ mark, node, children }) => {
				const childHTML = childrenToHTML(children);
				return (
					renderers.fallback?.({
						element: name,
						node: node.toJSON() as RichTextJSON,
						mark: mark.toJSON() as RichTextRenderMark,
						children: childHTML,
						defaultHTML: childHTML,
					}) ?? childHTML
				);
			};
		}
	}

	return { nodeMapping, markMapping };
};

/** Renders rich-text JSON using its hydrated node values. */
export const renderRichTextHTML = <
	TDocument extends CollectionDocument = CollectionDocument,
>(
	json: RichTextJSON,
	options?: RichTextRenderOptions<TDocument>,
): string => {
	const extensions = mergeExtensions(options?.extensions);
	const mappings = createRenderMappings({
		options,
		extensionNames: {
			nodes: extensions
				.filter((extension) => extension.type === "node")
				.map((extension) => extension.name),
			marks: extensions
				.filter((extension) => extension.type === "mark")
				.map((extension) => extension.name),
		},
	});

	return renderToHTMLString({
		content: json,
		extensions,
		options: mappings,
	});
};
