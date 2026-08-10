import { mergeAttributes, Node } from "@tiptap/core";
import { richTextNodeNames } from "../../types.js";

/** Block atom that points to a stable embedded-brick ref. */
export const LucidEmbeddedBrick = Node.create({
	name: richTextNodeNames.embeddedBrick,
	group: "block",
	atom: true,
	draggable: true,
	selectable: true,
	addAttributes() {
		return {
			ref: {
				default: null,
				parseHTML: (element) => element.getAttribute("data-lucid-brick-ref"),
				renderHTML: (attributes) =>
					typeof attributes.ref === "string"
						? { "data-lucid-brick-ref": attributes.ref }
						: {},
			},
		};
	},
	parseHTML() {
		return [{ tag: "div[data-lucid-rich-text-brick]" }];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			"div",
			mergeAttributes(HTMLAttributes, {
				"data-lucid-rich-text-brick": "",
			}),
		];
	},
});
