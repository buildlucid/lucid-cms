import { copy } from "../../../libs/i18n/index.js";
import { RequestDocumentsRepository } from "../../../libs/repositories/index.js";
import type { LucidActor } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkRequestVersionAccess from "../../requests/helpers/check-request-version-access.js";

/**
 * Finds the documents' proposals in an open request, checking the person can
 * edit each one before anything is translated.
 * @returns The request's locales, null when it covers every locale, and the proposals by document.
 */
const getRequestProposals: ServiceFn<
	[
		{
			requestId: number;
			collectionKey: string;
			documentIds: number[];
			user: LucidActor;
		},
	],
	{
		locales: string[] | null;
		proposals: Array<{ documentId: number; versionId: number }>;
	}
> = async (context, data) => {
	const RequestDocuments = new RequestDocumentsRepository(context.db);
	const documentsRes = await RequestDocuments.selectMultiple({
		select: ["document_id", "source_version_id"],
		where: [
			{ key: "request_id", operator: "=", value: data.requestId },
			{ key: "collection_key", operator: "=", value: data.collectionKey },
			{ key: "document_id", operator: "in", value: data.documentIds },
		],
		validation: { enabled: true },
	});
	if (documentsRes.error) return documentsRes;

	const proposals = documentsRes.data.flatMap((document) =>
		document.source_version_id === null
			? []
			: [
					{
						documentId: document.document_id,
						versionId: document.source_version_id,
					},
				],
	);
	//* every document has to be in the request already, with a proposal to translate
	if (proposals.length !== data.documentIds.length) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.translations.request.documents", {
					data: { requestId: data.requestId },
				}),
				status: 400,
			},
			data: undefined,
		};
	}

	let locales: string[] | null = null;
	for (const proposal of proposals) {
		const accessRes = await checkRequestVersionAccess(context, {
			collectionKey: data.collectionKey,
			documentId: proposal.documentId,
			versionId: proposal.versionId,
			user: data.user,
			edit: true,
		});
		if (accessRes.error) return accessRes;
		locales = accessRes.data.locales;
	}

	return { error: undefined, data: { locales, proposals } };
};

export default getRequestProposals;
