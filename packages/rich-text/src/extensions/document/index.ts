import { mergeAttributes, Node } from "@tiptap/core";
import { richTextNodeNames } from "../../types.js";
import { parseReferenceId } from "../utils.js";

/** Block atom that points to a Lucid collection document. */
export const LucidDocument = Node.create({
	name: richTextNodeNames.document,
	group: "block",
	atom: true,
	draggable: true,
	selectable: true,
	addAttributes() {
		return {
			collectionKey: {
				default: null,
				parseHTML: (element) =>
					element.getAttribute("data-lucid-collection-key"),
				renderHTML: (attributes) =>
					typeof attributes.collectionKey === "string"
						? { "data-lucid-collection-key": attributes.collectionKey }
						: {},
			},
			documentId: {
				default: null,
				parseHTML: (element) =>
					parseReferenceId(element.getAttribute("data-lucid-document-id")),
				renderHTML: (attributes) =>
					typeof attributes.documentId === "number"
						? { "data-lucid-document-id": String(attributes.documentId) }
						: {},
			},
		};
	},
	parseHTML() {
		return [{ tag: "div[data-lucid-rich-text-document]" }];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			"div",
			mergeAttributes(HTMLAttributes, {
				"data-lucid-rich-text-document": "",
			}),
		];
	},
});
