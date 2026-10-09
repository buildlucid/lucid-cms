import type { CollectionDocumentKey } from "../../../exports/types.js";
import type { ToolkitDocumentVersion } from "../documents/index.js";

/** A document to add to a request, with versions typed for its collection. */
export type ToolkitRequestDocument<
	K extends CollectionDocumentKey = CollectionDocumentKey,
> = {
	collectionKey: K;
	documentId: number;
	/** Publish requests only. Latest or an environment to publish from. Fixed once added. */
	source?: ToolkitDocumentVersion<K>;
	/** Publish requests: environments, or latest when the source is latest. Unpublish requests: environments to remove the document from. Delete requests take none. */
	targets?: ToolkitDocumentVersion<K>[];
};

/** One of a request document's targets. */
export type ToolkitRequestTarget = {
	collectionKey: string;
	documentId: number;
	target: string;
};
