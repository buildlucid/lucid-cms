import type { Refs, RelationFieldValue, ResponseBody } from "@types";
import request from "@/utils/request";

/** Fetches display data for items an open document links to but hasn't loaded. Items the user couldn't pick are left out. */
export const getEditorRefsReq = (params: {
	/** The collection of the document being edited. */
	collectionKey: string;
	body: {
		documents?: RelationFieldValue[];
		media?: number[];
		users?: number[];
		emails?: number[];
	};
}) =>
	request<ResponseBody<Refs>>({
		url: `/api/v1/documents/${params.collectionKey}/refs`,
		csrf: true,
		method: "POST",
		body: params.body,
		displayErrorToast: false,
	});
