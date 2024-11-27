export const getDocumentRoute = (
	mode: "create" | "edit",
	data: {
		collectionKey: string;
		useDrafts: boolean | undefined;
		documentId?: number;
		statusOverride?: "published" | "draft";
	},
) => {
	const useDrafts = data.useDrafts ?? false;

	if (mode === "create") {
		if (useDrafts) {
			return `/admin/collections/${data.collectionKey}/draft/create`;
		}
		return `/admin/collections/${data.collectionKey}/published/create`;
	}

	// use status override if provided
	if (data.statusOverride) {
		if (data.statusOverride === "published") {
			return `/admin/collections/${data.collectionKey}/published/${data.documentId}`;
		}
		return `/admin/collections/${data.collectionKey}/draft/${data.documentId}`;
	}

	// use drafts if enabled
	if (useDrafts) {
		return `/admin/collections/${data.collectionKey}/draft/${data.documentId}`;
	}
	return `/admin/collections/${data.collectionKey}/published/${data.documentId}`;
};
