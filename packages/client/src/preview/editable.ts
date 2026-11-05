import type { PreviewTarget } from "@lucidcms/types";
import {
	editAttribute,
	encodeEditMarkup,
	previewTargetKey,
} from "../contract.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

/** The target a preview read put on a document, brick, repeater item or nested section. */
const readTarget = (source: unknown): PreviewTarget | null => {
	if (!isRecord(source)) return null;
	const target = source[previewTargetKey];
	return isRecord(target) &&
		typeof target.collectionKey === "string" &&
		typeof target.documentId === "number" &&
		Array.isArray(target.path)
		? (target as PreviewTarget)
		: null;
};

export type EditableAttributes = { readonly [editAttribute]?: string };

function toMarkup(this: EditableAttributes) {
	const value = this[editAttribute];
	return value ? ` ${editAttribute}="${value}"` : "";
}

/**
 * Marks the element that renders a field of a previewed document, brick or repeater item, or
 * the brick or item itself when `field` is left out. Empty outside previews.
 *
 * @example
 * <h1 {...editable(page, "title")}>{page.fields.title}</h1>
 * `<h1${editable(page, "title")}>${page.fields.title}</h1>`
 */
export const editable = (
	source: unknown,
	field?: string,
): EditableAttributes => {
	const target = readTarget(source);
	const marked =
		target && field !== undefined
			? { ...target, path: [...target.path, field] }
			: target;
	const encoded =
		marked && (marked.path.length > 0 || marked.brick)
			? encodeEditMarkup(marked)
			: null;
	if (marked && encoded === null && marked.path.length > 0) {
		const path = marked.path
			.map((segment) => (typeof segment === "string" ? segment : "[item]"))
			.join(".");
		console.warn(
			`Lucid preview: ${path} is too deeply nested for editable() to mark, so it can't be picked on the page.`,
		);
	}
	return Object.defineProperty(
		encoded ? { [editAttribute]: encoded } : {},
		"toString",
		{ value: toMarkup },
	);
};
