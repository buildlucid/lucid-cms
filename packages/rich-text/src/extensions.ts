import {
	type AnyConfig,
	type AnyExtension,
	type Extensions,
	getExtensionField,
	mergeAttributes,
	Node,
} from "@tiptap/core";
import Link, { isAllowedUri } from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { richTextNodeNames } from "./types.js";

const parseReferenceId = (value: string | null) => {
	if (value === null) return null;
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
};

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

		if (attributes["data-lucid-link-kind"] === "document") {
			delete attributes.href;
		} else if (
			!this.options.isAllowedUri(
				typeof attributes.href === "string" ? attributes.href : "",
				{
					defaultValidate: (href) =>
						Boolean(isAllowedUri(href, this.options.protocols)),
					protocols: this.options.protocols,
					defaultProtocol: this.options.defaultProtocol,
				},
			)
		) {
			attributes.href = "";
		}

		return ["a", attributes, 0];
	},
});

/** Block atom that stores only a Lucid media ID. */
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

/** Inline atom that points to a top-level scalar document field. */
export const LucidVariable = Node.create({
	name: richTextNodeNames.variable,
	group: "inline",
	inline: true,
	atom: true,
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
			fieldKey: {
				default: null,
				parseHTML: (element) => element.getAttribute("data-lucid-field-key"),
				renderHTML: (attributes) =>
					typeof attributes.fieldKey === "string"
						? { "data-lucid-field-key": attributes.fieldKey }
						: {},
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
			typeof HTMLAttributes.fieldKey === "string"
				? HTMLAttributes.fieldKey
				: "",
		];
	},
});

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

const flattenRichTextExtensions = (inputExtensions: Extensions): Extensions => {
	return inputExtensions.flatMap((extension) => {
		const addExtensions = getExtensionField<AnyConfig["addExtensions"]>(
			extension,
			"addExtensions",
			{
				name: extension.name,
				options: extension.options,
				storage: extension.storage,
			},
		);

		if (extension.type !== "extension" || !addExtensions) {
			return extension;
		}

		return flattenRichTextExtensions(addExtensions() as AnyExtension[]);
	});
};

/** Creates the default Lucid rich-text extension set. */
const createCoreExtensions = (): Extensions => {
	return flattenRichTextExtensions([
		StarterKit.configure({
			link: false,
		}),
		LucidLink.configure({
			openOnClick: true,
			HTMLAttributes: {
				target: null,
				rel: null,
				class: null,
			},
		}),
		LucidMedia,
		LucidVariable,
		LucidEmbeddedBrick,
	]);
};

export const extensions = createCoreExtensions();

/** Merges custom extensions by name over Lucid's defaults. */
export const mergeExtensions = (customExtensions?: Extensions): Extensions => {
	if (!customExtensions?.length) {
		return extensions;
	}

	const mergedExtensions = new Map(
		extensions.map((extension) => [extension.name, extension]),
	);

	for (const extension of flattenRichTextExtensions(customExtensions)) {
		mergedExtensions.set(extension.name, extension);
	}

	return Array.from(mergedExtensions.values());
};
