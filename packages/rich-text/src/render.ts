import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";
import { renderEmbeddedBrickNode } from "./extensions/embedded-brick/render.js";
import { mergeExtensions } from "./extensions/index.js";
import { renderLinkMark } from "./extensions/link/render.js";
import { renderMediaNode } from "./extensions/media/render.js";
import { renderVariableNode } from "./extensions/variable/render.js";
import {
	type RichTextEmbeddedBrick,
	type RichTextJSON,
	type RichTextRenderOptions,
	richTextNodeNames,
} from "./types.js";

/** Renders rich-text JSON using its hydrated node values. */
export const renderRichTextHTML = (
	json: RichTextJSON,
	options?: RichTextRenderOptions,
): string => {
	const embeddedBricks = new Map<string, RichTextEmbeddedBrick>(
		(options?.bricks ?? []).map((brick) => [brick.ref, brick]),
	);

	return renderToHTMLString({
		content: json,
		extensions: mergeExtensions(options?.extensions),
		options: {
			markMapping: {
				link: ({ mark, children }) =>
					renderLinkMark({ attrs: mark.attrs, children }),
			},
			nodeMapping: {
				[richTextNodeNames.media]: ({ node }) =>
					renderMediaNode(node.attrs.media),
				[richTextNodeNames.variable]: ({ node }) =>
					renderVariableNode(node.attrs.value),
				[richTextNodeNames.embeddedBrick]: ({ node }) => {
					const ref = node.attrs.ref;
					return renderEmbeddedBrickNode({
						node: node.toJSON(),
						brick:
							typeof ref === "string" ? embeddedBricks.get(ref) : undefined,
						renderer: options?.renderers?.bricks,
					});
				},
			},
		},
	});
};
