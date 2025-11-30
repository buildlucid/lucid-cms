import type { DocumentVersionType } from "@types";

export const getDocumentRoute = (
	mode: "create" | "edit",
	data: {
		collectionKey: string;
		documentId?: number;
		status?: DocumentVersionType;
	},
) => {
	if (mode === "create") {
		return `/admin/collections/${data.collectionKey}/latest/create`;
	}

	return `/admin/collections/${data.collectionKey}/${data.status ?? "latest"}/${data.documentId}`;
};
