import type {
	CollectionDocumentKey,
	CollectionDocumentVersionKey,
} from "../../../exports/types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import createSingle from "./create-single/index.js";
import deleteMultiple from "./delete-multiple/index.js";
import deleteSingle from "./delete-single/index.js";
import getEditable from "./get-editable/index.js";
import type {
	ToolkitDocumentsGetMultipleInput,
	ToolkitDocumentsGetMultipleResult,
} from "./get-multiple/index.js";
import getMultiple from "./get-multiple/index.js";
import type {
	ToolkitDocumentsGetSingleInput,
	ToolkitDocumentsGetSingleResult,
} from "./get-single/index.js";
import getSingle from "./get-single/index.js";
import notifyChange from "./notify-change/index.js";
import patchSingle from "./patch-single/index.js";
import updateSingle from "./update-single/index.js";

export type ToolkitDocumentVersion<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = CollectionDocumentVersionKey<TCollectionKey>;

/**
 * Read collection content and create, edit or delete stored documents.
 */
export type ToolkitDocuments = {
	/**
	 * Creates a document using field values and collection defaults. Saves latest content without publishing it.
	 *
	 * @example
	 * ```ts
	 * await toolkit.documents.createSingle({
	 *   collectionKey: "article",
	 *   actor: { kind: "system" },
	 *   data: {
	 *     fields: {
	 *       title: { en: "Hello" },
	 *       featured: false,
	 *     },
	 *   },
	 * });
	 * ```
	 */
	createSingle: <K extends string>(
		input: Parameters<typeof createSingle<K>>[1],
	) => ReturnType<typeof createSingle<K>>;
	/**
	 * Updates supplied values in the latest document. Omitted fields and locales are preserved; arrays replace their contents.
	 *
	 * @example
	 * ```ts
	 * await toolkit.documents.updateSingle({
	 *   collectionKey: "article",
	 *   id: 1,
	 *   actor: { kind: "system" },
	 *   data: {
	 *     fields: {
	 *       title: { en: "New title" },
	 *     },
	 *   },
	 * });
	 * ```
	 */
	updateSingle: <K extends string>(
		input: Parameters<typeof updateSingle<K>>[1],
	) => ReturnType<typeof updateSingle<K>>;
	/**
	 * Returns stored values, stable nested refs and an edit token. Useful for editing or conditional writes; does not reserve the document.
	 *
	 * @example
	 * ```ts
	 * const editable = await toolkit.documents.getEditable({
	 *   collectionKey: "article",
	 *   id: 1,
	 * });
	 * if (editable.error) return editable;
	 *
	 * await toolkit.documents.updateSingle({
	 *   collectionKey: "article",
	 *   id: editable.data.id,
	 *   actor: { kind: "system" },
	 *   ifUnchanged: editable.data.editToken,
	 *   data: {
	 *     fields: {
	 *       title: { en: "Reviewed title" },
	 *     },
	 *   },
	 * });
	 * ```
	 */
	getEditable: <K extends string>(
		input: Parameters<typeof getEditable<K>>[1],
	) => ReturnType<typeof getEditable<K>>;
	/**
	 * Applies targeted changes in order, then validates and saves the resulting document.
	 * Use refs from getEditable to address existing repeater items or builder bricks.
	 *
	 * @example
	 * ```ts
	 * await toolkit.documents.patchSingle({
	 *   collectionKey: "article",
	 *   id: 1,
	 *   actor: { kind: "system" },
	 *   operations: [
	 *     {
	 *       op: "set",
	 *       path: ["fields", "title", "en"],
	 *       value: "New title",
	 *     },
	 *   ],
	 * });
	 * ```
	 */
	patchSingle: <K extends string>(
		input: Parameters<typeof patchSingle<K>>[1],
	) => ReturnType<typeof patchSingle<K>>;
	/** Moves a document to the bin. Set hard to permanently delete it and its history. */
	deleteSingle: (
		input: Parameters<typeof deleteSingle>[1],
	) => ReturnType<typeof deleteSingle>;
	/** Deletes explicit IDs independently and returns each outcome. Duplicate IDs are processed once. */
	deleteMultiple: (
		input: Parameters<typeof deleteMultiple>[1],
	) => ReturnType<typeof deleteMultiple>;
	/**
	 * Returns multiple documents from a collection.
	 *
	 * The response includes the matching documents and a total count.
	 * Pass an array to `query.filter` when each object should be an OR branch.
	 *
	 * @example
	 * ```ts
	 * await toolkit.documents.getMultiple({
	 *   collectionKey: "page",
	 *   version: "published",
	 *   query: {
	 *     perPage: 50,
	 *   },
	 * });
	 * ```
	 */
	getMultiple: <TCollectionKey extends CollectionDocumentKey>(
		input: ToolkitDocumentsGetMultipleInput<TCollectionKey>,
	) => ServiceResponse<ToolkitDocumentsGetMultipleResult<TCollectionKey>>;
	/**
	 * Returns a single document from a collection.
	 *
	 * Useful when you expect one matching document for a slug, ID, or other filter.
	 * Pass an array to `query.filter` when each object should be an OR branch.
	 *
	 * @example
	 * ```ts
	 * await toolkit.documents.getSingle({
	 *   collectionKey: "page",
	 *   version: "published",
	 *   query: {
	 *     filter: {
	 *       _fullSlug: {
	 *         value: "/about",
	 *       },
	 *     },
	 *   },
	 * });
	 * ```
	 */
	getSingle: <TCollectionKey extends CollectionDocumentKey>(
		input: ToolkitDocumentsGetSingleInput<TCollectionKey>,
	) => ServiceResponse<ToolkitDocumentsGetSingleResult<TCollectionKey>>;
	/** Reports changed IDs after direct writes. Does not save content or run authoring hooks. */
	notifyChange: (
		input: Parameters<typeof notifyChange>[1],
	) => ReturnType<typeof notifyChange>;
};

/** Creates document helpers for a toolkit instance. */
export const createDocumentsToolkit = (
	context: ServiceContext,
): ToolkitDocuments => ({
	createSingle: (input) => createSingle(context, input),
	updateSingle: (input) => updateSingle(context, input),
	getEditable: (input) => getEditable(context, input),
	patchSingle: (input) => patchSingle(context, input),
	deleteSingle: (input) => deleteSingle(context, input),
	deleteMultiple: (input) => deleteMultiple(context, input),
	getMultiple: (input) => getMultiple(context, input),
	getSingle: (input) => getSingle(context, input),
	notifyChange: (input) => notifyChange(context, input),
});

export default createDocumentsToolkit;
