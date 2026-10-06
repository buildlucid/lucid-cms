import { mergeAttributes, Node } from "@tiptap/core";
import { richTextNodeNames } from "../../types.js";
import { parseReferenceId } from "../utils.js";

/**
 * Inline atom that mentions a user. The label is the name shown when the
 * mention was written, so it renders without looking the user up.
 */
export const LucidMention = Node.create({
	name: richTextNodeNames.mention,
	group: "inline",
	inline: true,
	atom: true,
	selectable: false,
	addAttributes() {
		return {
			userId: {
				default: null,
				parseHTML: (element) =>
					parseReferenceId(element.getAttribute("data-lucid-user-id")),
				renderHTML: (attributes) =>
					typeof attributes.userId === "number"
						? { "data-lucid-user-id": String(attributes.userId) }
						: {},
			},
			label: {
				default: null,
				parseHTML: (element) => element.textContent?.replace(/^@/, "") || null,
				renderHTML: () => ({}),
			},
		};
	},
	parseHTML() {
		return [{ tag: "span[data-lucid-mention]" }];
	},
	renderHTML({ node, HTMLAttributes }) {
		return [
			"span",
			mergeAttributes(HTMLAttributes, { "data-lucid-mention": "" }),
			`@${node.attrs.label ?? ""}`,
		];
	},
	renderText({ node }) {
		return `@${node.attrs.label ?? ""}`;
	},
});
