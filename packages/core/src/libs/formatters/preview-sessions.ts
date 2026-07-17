import type { PreviewSession } from "../../types/response.js";
import type { LucidPreviewSessions, Select } from "../db/types.js";

type PreviewSessionQueryResponse = Pick<
	Select<LucidPreviewSessions>,
	| "entry_collection_key"
	| "entry_document_id"
	| "entry_version_type"
	| "mode"
	| "entry_version_id"
	| "expires_at"
>;

const formatSingle = (props: {
	session: PreviewSessionQueryResponse;
}): PreviewSession => {
	return {
		mode: props.session.mode,
		entry: {
			collectionKey: props.session.entry_collection_key,
			documentId: props.session.entry_document_id,
			version: props.session.entry_version_type,
			versionId: props.session.entry_version_id,
		},
		expiresAt: new Date(props.session.expires_at).toISOString(),
	};
};

export default {
	formatSingle,
};
