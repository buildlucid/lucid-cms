import type { DocumentPreviewResolveResponse } from "../../types/response.js";
import type { LucidDocumentPreviews, Select } from "../db/types.js";

type DocumentPreviewResolveQueryResponse = Pick<
	Select<LucidDocumentPreviews>,
	| "collection_key"
	| "document_id"
	| "version_type"
	| "version_id"
	| "expires_at"
>;

const formatSingle = (props: {
	preview: DocumentPreviewResolveQueryResponse;
}): DocumentPreviewResolveResponse => {
	return {
		collectionKey: props.preview.collection_key,
		documentId: props.preview.document_id,
		versionType: props.preview.version_type,
		versionId: props.preview.version_id,
		expiresAt: new Date(props.preview.expires_at).toISOString(),
	};
};

export default {
	formatSingle,
};
