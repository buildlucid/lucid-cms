import type {
	CollectionDocumentKey,
	ContentDocument,
	ContentList,
	DocumentListInput,
	IsLocalized,
} from "../../../../exports/types.js";

/** Content document list options, also accepted by the client's `documents.getMultiple`. */
export type ToolkitDocumentsGetMultipleInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
	TLocale extends string | undefined = undefined,
> = DocumentListInput<TCollectionKey, TLocale> & {
	/** Optional preview context that may override the requested version. */
	preview?: string | null;
};

/** Content documents and pagination. */
export type ToolkitDocumentsGetMultipleResult<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
	TLocale extends string | undefined = undefined,
> = ContentList<ContentDocument<TCollectionKey, IsLocalized<TLocale>>>;
