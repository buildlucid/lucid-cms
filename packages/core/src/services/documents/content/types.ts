import type { CollectionDocumentVersion } from "../../../exports/types.js";

export type ContentDocumentVersionInput<
	TCollectionKey extends string = string,
> = {
	versionType: CollectionDocumentVersion<TCollectionKey>;
	versionId?: number;
	preview?: string;
	/** Trusted callers, eg. preview creation, may read request proposals and snapshots by ID. */
	includeRequestVersions?: boolean;
};

/** What a content API read asks for besides its query: one locale and the one empty translations fall back to, and how many levels of related documents to fill in. */
export type ContentReadOptions = {
	locale?: string;
	fallbackLocale?: string;
	depth?: number;
};
