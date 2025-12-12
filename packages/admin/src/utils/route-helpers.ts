import type { DocumentVersionType } from "@types";

export const getDocumentRoute = (
	mode: "create" | "edit",
	data: {
		collectionKey: string;
		documentId?: number;
		status?: DocumentVersionType;
		versionId?: number;
	},
) => {
	if (mode === "create") {
		return `/admin/collections/${data.collectionKey}/latest/create`;
	}

	if (data.status === "revision") {
		return `/admin/collections/${data.collectionKey}/revision/${data.documentId}/${data.versionId}`;
	}

	return `/admin/collections/${data.collectionKey}/${data.status ?? "latest"}/${data.documentId}`;
};
