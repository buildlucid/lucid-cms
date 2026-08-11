import { mergeAttributes, Node } from "@tiptap/core";
import { richTextNodeNames } from "../../types.js";
import { parseReferenceId } from "../utils.js";

/** Inline atom that points to a scalar value on a supported Lucid resource. */
export const LucidVariable = Node.create({
	name: richTextNodeNames.variable,
	group: "inline",
	inline: true,
	atom: true,
	selectable: true,
	addAttributes() {
		return {
			source: {
				default: null,
				parseHTML: (element) =>
					element.getAttribute("data-lucid-variable-source"),
				renderHTML: (attributes) =>
					attributes.source === "document" || attributes.source === "user"
						? { "data-lucid-variable-source": attributes.source }
						: {},
			},
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
			userId: {
				default: null,
				parseHTML: (element) =>
					parseReferenceId(element.getAttribute("data-lucid-user-id")),
				renderHTML: (attributes) =>
					typeof attributes.userId === "number"
						? { "data-lucid-user-id": String(attributes.userId) }
						: {},
			},
			fieldKey: {
				default: null,
				parseHTML: (element) => element.getAttribute("data-lucid-field-key"),
				renderHTML: (attributes) =>
					typeof attributes.fieldKey === "string"
						? { "data-lucid-field-key": attributes.fieldKey }
						: {},
			},
			value: {
				default: null,
				renderHTML: () => ({}),
			},
		};
	},
	parseHTML() {
		return [{ tag: "span[data-lucid-rich-text-variable]" }];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			"span",
			mergeAttributes(HTMLAttributes, {
				"data-lucid-rich-text-variable": "",
			}),
			typeof HTMLAttributes.value === "string" ? HTMLAttributes.value : "",
		];
	},
});
