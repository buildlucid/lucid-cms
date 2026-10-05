import type { CollectionDocumentVersion } from "../../../exports/types.js";

export type ContentDocumentVersionInput<
	TCollectionKey extends string = string,
> = {
	versionType: CollectionDocumentVersion<TCollectionKey>;
	versionId?: number;
	preview?: string;
	/** Trusted callers, eg. preview creation, may read release proposals and snapshots by ID. */
	includeReleaseVersions?: boolean;
};
