import { mergeAttributes, Node } from "@tiptap/core";
import { richTextNodeNames } from "../../types.js";
import { parseReferenceId } from "../utils.js";

/** Block atom that stores a Lucid media ID and response-only render data. */
export const LucidMedia = Node.create({
	name: richTextNodeNames.media,
	group: "block",
	atom: true,
	draggable: true,
	selectable: true,
	addAttributes() {
		return {
			mediaId: {
				default: null,
				parseHTML: (element) =>
					parseReferenceId(element.getAttribute("data-lucid-media-id")),
				renderHTML: (attributes) =>
					typeof attributes.mediaId === "number"
						? { "data-lucid-media-id": String(attributes.mediaId) }
						: {},
			},
			media: {
				default: null,
				renderHTML: () => ({}),
			},
		};
	},
	parseHTML() {
		return [{ tag: "div[data-lucid-rich-text-media]" }];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			"div",
			mergeAttributes(HTMLAttributes, {
				"data-lucid-rich-text-media": "",
			}),
		];
	},
});
