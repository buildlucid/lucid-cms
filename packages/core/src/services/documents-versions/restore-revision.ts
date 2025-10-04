import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import services from "../index.js";

const restoreRevision: ServiceFn<
	[
		{
			documentId: number;
			versionId: number;
			userId: number;
			collectionKey: string;
		},
	],
	undefined
> = async (context, data) => {
	const collectionRes = services.collections.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	if (collectionRes.data.getData.config.useRevisions === false) {
		return {
			error: {
				type: "basic",
				name: T("revisions_not_enabled_error_name"),
				message: T("revisions_not_enabled_message"),
				status: 400,
			},
			data: undefined,
		};
	}

	const response = await services.documentVersions.promoteVersion(context, {
		documentId: data.documentId,
		collectionKey: data.collectionKey,
		fromVersionId: data.versionId,
		toVersionType: collectionRes.data.getData.config.useDrafts
			? "draft"
			: "published",
		userId: data.userId,
		skipRevisionCheck: true,
	});
	if (response.error) return response;

	return {
		error: undefined,
		data: undefined,
	};
};

export default restoreRevision;
