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
