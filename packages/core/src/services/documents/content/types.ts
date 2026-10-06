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
