import { copy } from "../../../libs/i18n/index.js";
import { RequestDocumentsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** The version holding a document's proposal in a request, or not found when the request doesn't hold the document. */
const getProposalVersionId: ServiceFn<
	[{ requestId: number; collectionKey: string; documentId: number }],
	number
> = async (context, data) => {
	const RequestDocuments = new RequestDocumentsRepository(context.db);

	const proposalRes = await RequestDocuments.selectSingle({
		select: ["source_version_id"],
		where: [
			{ key: "request_id", operator: "=", value: data.requestId },
			{ key: "collection_key", operator: "=", value: data.collectionKey },
			{ key: "document_id", operator: "=", value: data.documentId },
		],
	});
	if (proposalRes.error) return proposalRes;

	const versionId = proposalRes.data?.source_version_id;
	if (!versionId) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	return { error: undefined, data: versionId };
};

export default getProposalVersionId;
