import type { CollectionDocumentVersion } from "../../../types.js";

export type ClientDocumentVersionInput<TCollectionKey extends string = string> =
	{
		versionType: CollectionDocumentVersion<TCollectionKey>;
		versionId?: number;
		preview?: string;
	};
