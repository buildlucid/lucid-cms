import type {
	CollectionDocumentKey,
	CollectionDocumentVersionKey,
} from "../../../exports/types.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import createSingle from "./create-single/index.js";
import deleteMultiple from "./delete-multiple/index.js";
import deleteSingle from "./delete-single/index.js";
import getEditable from "./get-editable/index.js";
import createGetMultiple from "./get-multiple/index.js";
import createGetSingle from "./get-single/index.js";
import notifyChange from "./notify-change/index.js";
import patchSingle from "./patch-single/index.js";
import publish from "./publish/index.js";
import translate from "./translate/index.js";
import unpublish from "./unpublish/index.js";
import updateSingle from "./update-single/index.js";

export type ToolkitDocumentVersion<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = CollectionDocumentVersionKey<TCollectionKey>;

/**
 * Read collection content and create, edit, publish or delete stored documents.
 */
export type ToolkitDocuments = {
	/**
	 * Creates unpublished latest content with collection defaults, or a hidden proposal when `request` is supplied.
	 *
	 * @example
	 * ```ts
	 * await toolkit.documents.createSingle({
	 *   collectionKey: "article",
	 *   actor: { type: "system" },
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
	 * Updates latest or a request proposal, preserving omitted values while arrays set membership and order and retained refs merge values.
	 *
	 * @example
	 * ```ts
	 * await toolkit.documents.updateSingle({
	 *   collectionKey: "article",
	 *   id: 1,
	 *   actor: { type: "system" },
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
	 * Reads latest or a request proposal with stable refs and an edit token, without reserving the document.
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
	 *   actor: { type: "system" },
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
	 * Applies ordered operations using nested refs, then validates and saves latest or the proposal selected by `requestId`.
	 *
	 * @example
	 * ```ts
	 * await toolkit.documents.patchSingle({
	 *   collectionKey: "article",
	 *   id: 1,
	 *   actor: { type: "system" },
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
	/** Publishes latest to an environment that doesn't require review. */
	publish: (input: Parameters<typeof publish>[1]) => ReturnType<typeof publish>;
	/** Unpublishes a document from an environment that doesn't require review. */
	unpublish: (
		input: Parameters<typeof unpublish>[1],
	) => ReturnType<typeof unpublish>;
	/**
	 * Returns document `items` with `pagination`, resolving media, users and relations through `depth`, selecting `locale` when supplied and treating `query.filter` arrays as OR branches.
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
	getMultiple: ReturnType<typeof createGetMultiple>;
	/**
	 * Returns one document with hydrated media and users, relations through `depth`, ordered builder bricks, keyed fixed bricks, optional `locale` selection and OR branches from `query.filter` arrays.
	 *
	 * @example
	 * ```ts
	 * await toolkit.documents.getSingle({
	 *   collectionKey: "page",
	 *   version: "published",
	 *   locale: "en",
	 *   query: {
	 *     filter: {
	 *       _path: {
	 *         value: "/about",
	 *       },
	 *     },
	 *     include: ["bricks"],
	 *   },
	 * });
	 * ```
	 */
	getSingle: ReturnType<typeof createGetSingle>;
	/**
	 * Translates documents from their default locale with Lucid AI, opening a request per locale. Pass `requestId` to translate an existing request's proposals, or `direct: true` to save straight to latest without review. Only missing and out-of-date machine translations are made unless `overwrite` is set.
	 *
	 * @example
	 * ```ts
	 * await toolkit.documents.translate({
	 *   collectionKey: "page",
	 *   documentIds: [1, 2],
	 *   locales: ["fr"],
	 *   actor: { type: "system" },
	 * });
	 * ```
	 */
	translate: (
		input: Parameters<typeof translate>[1],
	) => ReturnType<typeof translate>;
	/** Reports changed IDs after direct writes, such as to `collections.getSchema` tables, so caches, change subscribers and referencing documents update. Does not save content or run authoring hooks. */
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
	publish: (input) => publish(context, input),
	unpublish: (input) => unpublish(context, input),
	translate: (input) => translate(context, input),
	getMultiple: createGetMultiple(context),
	getSingle: createGetSingle(context),
	notifyChange: (input) => notifyChange(context, input),
});

export default createDocumentsToolkit;
