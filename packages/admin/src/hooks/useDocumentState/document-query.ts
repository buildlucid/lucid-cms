import type { DocumentVersionType } from "@types";
import constants from "@/constants";
import { queries } from "@/services/queries";

/**
 * Reads the document version the editor shows. Route preloading uses the same
 * options, so a prefetch fills the editor's cache entry. Revisions, snapshots
 * and proposals wait for their version ID.
 */
export const documentQueryOptions = (params: {
	collectionKey: string;
	documentId: number | undefined;
	version: DocumentVersionType;
	versionId: number | undefined;
}) => {
	const stored =
		params.version === "revision" ||
		params.version === "snapshot" ||
		params.version === "proposal";

	return {
		...queries.documents.detail({
			collectionKey: params.collectionKey,
			documentId: params.documentId,
			version: stored ? params.versionId : params.version,
			include: { bricks: true, refs: true },
		}),
		refetchOnWindowFocus: false,
		staleTime: constants.preloadStaleTime,
	};
};
