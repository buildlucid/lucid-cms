import { mergeAttributes } from "@tiptap/core";
import Link, { isAllowedUri } from "@tiptap/extension-link";
import { parseReferenceId } from "../utils.js";

/** Link mark that stores either an external URL or a Lucid document identity. */
export const LucidLink = Link.extend({
	addAttributes() {
		return {
			...this.parent?.(),
			kind: {
				default: "external",
				parseHTML: (element) =>
					element.getAttribute("data-lucid-link-kind") ?? "external",
				renderHTML: (attributes) => ({
					"data-lucid-link-kind": attributes.kind,
				}),
			},
			collectionKey: {
				default: null,
				parseHTML: (element) =>
					element.getAttribute("data-lucid-collection-key"),
				renderHTML: (attributes) =>
					attributes.collectionKey
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
		return [{ tag: "a[href]" }, { tag: 'a[data-lucid-link-kind="document"]' }];
	},
	renderHTML({ HTMLAttributes }) {
		const attributes = mergeAttributes(
			this.options.HTMLAttributes,
			HTMLAttributes,
		) as Record<string, unknown>;
		const href = typeof attributes.href === "string" ? attributes.href : "";

		if (
			!href ||
			!this.options.isAllowedUri(href, {
				defaultValidate: (value) =>
					Boolean(isAllowedUri(value, this.options.protocols)),
				protocols: this.options.protocols,
				defaultProtocol: this.options.defaultProtocol,
			})
		) {
			delete attributes.href;
		}

		return ["a", attributes, 0];
	},
});
