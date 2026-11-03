import type { InternalDocumentField } from "@types";
import type { BrickData } from "@/store/brickStore/brickStore";
import request from "@/utils/request";

/** Shows the editor's unsaved content in the builder preview, or the stored version again when `draft` is null. */
export const updatePreviewDraftReq = (params: {
	collectionKey: string;
	documentId: number;
	versionId: number;
	token: string;
	revision: number;
	draft: {
		bricks: Array<BrickData>;
		fields: Array<InternalDocumentField>;
	} | null;
}) =>
	request<undefined>({
		url: `/api/v1/documents/${params.collectionKey}/${params.documentId}/${params.versionId}/preview-draft`,
		csrf: true,
		method: "PUT",
		body: {
			token: params.token,
			revision: params.revision,
			draft: params.draft,
		},
		displayErrorToast: false,
	});
