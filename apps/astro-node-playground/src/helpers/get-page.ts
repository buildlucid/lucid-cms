import getToolkit from "@lucidcms/astro/toolkit";
import type { PageCollectionDocumentStatus } from "../../.lucid/client";

type GetPageOptions = {
	fullSlug: string;
	previewToken?: string;
};

const getPage = async ({ fullSlug, previewToken }: GetPageOptions) => {
	const toolkit = await getToolkit();

	if (!previewToken) {
		return toolkit.documents.getSingle({
			collectionKey: "page",
			status: "production",
			query: {
				filter: { _fullSlug: { value: fullSlug } },
				include: ["bricks"],
			},
		});
	}

	const previewResponse = await toolkit.previews.resolve({
		token: previewToken,
	});
	if (previewResponse.error) {
		return {
			error: previewResponse.error,
			data: undefined,
		};
	}

	return toolkit.documents.getSingle({
		collectionKey: "page",
		status: previewResponse.data.versionType as PageCollectionDocumentStatus,
		versionId: previewResponse.data.versionId ?? undefined,
		preview: previewToken,
		query: {
			filter: { id: { value: previewResponse.data.documentId } },
			include: ["bricks"],
		},
	});
};

export default getPage;
