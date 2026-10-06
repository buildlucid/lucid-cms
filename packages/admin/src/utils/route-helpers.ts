import type { DocumentVersionType } from "@types";

export const getDocumentRoute = (
	mode: "create" | "edit",
	data: {
		collectionKey: string;
		documentId?: number;
		version?: DocumentVersionType;
		versionId?: number;
	},
) => {
	if (mode === "create") {
		return `/lucid/collections/${data.collectionKey}/latest/create`;
	}

	if (data.version === "revision") {
		return `/lucid/collections/${data.collectionKey}/revision/${data.documentId}/${data.versionId}`;
	}

	if (data.version === "snapshot") {
		return `/lucid/collections/${data.collectionKey}/snapshot/${data.documentId}/${data.versionId}`;
	}

	return `/lucid/collections/${data.collectionKey}/${data.version ?? "latest"}/${data.documentId}`;
};

/** A request's page, or the proposal or snapshot it owns for one document. */
export const getRequestRoute = (data: {
	requestId: number;
	content?: { collectionKey: string; documentId: number };
}) =>
	data.content
		? `/lucid/requests/${data.requestId}/content/${data.content.collectionKey}/${data.content.documentId}`
		: `/lucid/requests/${data.requestId}`;
