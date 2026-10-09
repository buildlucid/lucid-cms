import { copy } from "../../../libs/i18n/index.js";
import { RequestDocumentsRepository } from "../../../libs/repositories/index.js";
import type { LucidActor } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkRequestVersionAccess from "../../requests/helpers/check-request-version-access.js";

/** Finds a document's readable request proposal, hiding unreadable requests and leaving edit checks to the save. */
const resolveProposalVersion: ServiceFn<
	[
		{
			requestId: number;
			collectionKey: string;
			documentId: number;
			user: LucidActor;
		},
	],
	number
> = async (context, input) => {
	const RequestDocuments = new RequestDocumentsRepository(context.db);
	const documentRes = await RequestDocuments.selectSingle({
		select: ["source_version_id"],
		where: [
			{ key: "request_id", operator: "=", value: input.requestId },
			{ key: "collection_key", operator: "=", value: input.collectionKey },
			{ key: "document_id", operator: "=", value: input.documentId },
			{ key: "source", operator: "=", value: "latest" },
		],
	});
	if (documentRes.error) return documentRes;

	const versionId = documentRes.data?.source_version_id;
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

	const accessRes = await checkRequestVersionAccess(context, {
		collectionKey: input.collectionKey,
		documentId: input.documentId,
		versionId,
		user: input.user,
	});
	if (accessRes.error) return accessRes;

	return { error: undefined, data: versionId };
};

export default resolveProposalVersion;
