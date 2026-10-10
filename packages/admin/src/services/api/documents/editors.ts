import type { DocumentEditors, ResponseBody } from "@types";
import request from "@/utils/request";

type EditorLocation = {
	collectionKey: string;
	documentId: number;
	tabId: string;
};

const editorUrl = (location: EditorLocation) =>
	`/lucid/api/v1/documents/${location.collectionKey}/${location.documentId}/editors/${encodeURIComponent(location.tabId)}`;

/** Tells the server this tab still has the document open, and learns who holds it. */
export const updateEditorReq = (
	params: EditorLocation & {
		/** The request whose proposal is open, or null for latest. */
		requestId: number | null;
		takeOver?: boolean;
	},
) =>
	request<ResponseBody<DocumentEditors>>({
		url: editorUrl(params),
		csrf: true,
		method: "PUT",
		body: { requestId: params.requestId, takeOver: params.takeOver ?? false },
		displayErrorToast: false,
	});

/** Lets go of the document when the editor closes, even as the tab unloads. */
export const deleteEditorReq = (params: EditorLocation) =>
	request<undefined>({
		url: editorUrl(params),
		csrf: true,
		method: "DELETE",
		keepalive: true,
		displayErrorToast: false,
	});
