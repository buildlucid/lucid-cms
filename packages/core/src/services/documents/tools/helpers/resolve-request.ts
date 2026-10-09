import type { RichTextJSON } from "@lucidcms/rich-text";
import type { RequestType } from "../../../../libs/db/tables/requests.js";
import { copy } from "../../../../libs/i18n/index.js";
import { AgentRequestReferencesRepository } from "../../../../libs/repositories/index.js";
import type { LucidActor } from "../../../../types/hono.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import addDocuments from "../../../requests/add-documents.js";
import createSingle from "../../../requests/create-single.js";
import loadRequest from "../../../requests/helpers/load-request.js";
import type {
	RequestDocumentRecord,
	RequestRecord,
} from "../../../requests/types.js";
import updateTargets from "../../../requests/update-targets.js";

const findDocument = (
	request: RequestRecord,
	document: { collectionKey: string; documentId: number },
) =>
	request.documents.find(
		(candidate) =>
			candidate.collection_key === document.collectionKey &&
			candidate.document_id === document.documentId,
	);

/** Uses a supplied request, reuses the chat's matching open request or creates one, adding missing documents and targets. */
const resolveRequest: ServiceFn<
	[
		{
			type: Exclude<RequestType, "create">;
			document: {
				collectionKey: string;
				documentId: number;
				/** Latest for content changes. Omit for unpublish and delete requests. */
				source?: string;
				targets: string[];
			};
			requestId?: number;
			conversationId: string;
			user: LucidActor;
			agentRunId?: string;
			/** Used when a new request is opened. */
			details: { title: string; description: RichTextJSON | null };
		},
	],
	{
		request: Pick<RequestRecord, "id" | "type">;
		document: RequestDocumentRecord;
	}
> = async (context, data) => {
	const AgentRequestReferences = new AgentRequestReferencesRepository(
		context.db,
	);
	const types: RequestType[] =
		data.type === "publish" ? ["publish", "create"] : [data.type];

	let requestId = data.requestId;
	if (requestId === undefined) {
		const reusedRes = await AgentRequestReferences.selectOpenForDocument({
			conversationId: data.conversationId,
			collectionKey: data.document.collectionKey,
			documentId: data.document.documentId,
			types,
			source: data.document.source ?? null,
		});
		if (reusedRes.error) return reusedRes;

		requestId = reusedRes.data?.id;
	}

	if (requestId === undefined) {
		const createdRes = await createSingle(context, {
			type: data.type,
			title: data.details.title,
			description: data.details.description,
			documents: [data.document],
			user: data.user,
			agentRunId: data.agentRunId,
		});
		if (createdRes.error) return createdRes;

		requestId = createdRes.data.id;
	}

	let requestRes = await loadRequest(context, {
		id: requestId,
		user: data.user,
	});
	if (requestRes.error) return requestRes;
	if (
		requestRes.data.status !== "open" ||
		!types.includes(requestRes.data.type)
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.tools.documents.request.unsupported", {
					data: { requestId },
				}),
				status: 400,
			},
			data: undefined,
		};
	}

	const existing = findDocument(requestRes.data, data.document);
	const missingTargets = data.document.targets.filter(
		(target) =>
			!existing?.targets.some((candidate) => candidate.target === target),
	);
	if (!existing) {
		const addedRes = await addDocuments(context, {
			id: requestId,
			documents: [data.document],
			user: data.user,
			agentRunId: data.agentRunId,
		});
		if (addedRes.error) return addedRes;
	} else if (missingTargets.length > 0) {
		const targetsRes = await updateTargets(context, {
			id: requestId,
			requestDocumentId: existing.id,
			user: data.user,
			agentRunId: data.agentRunId,
			targets: [
				...existing.targets.map((target) => target.target),
				...missingTargets,
			],
		});
		if (targetsRes.error) return targetsRes;
	}

	if (!existing || missingTargets.length > 0) {
		requestRes = await loadRequest(context, { id: requestId });
		if (requestRes.error) return requestRes;
	}

	const document = findDocument(requestRes.data, data.document);
	if (!document || document.source !== (data.document.source ?? null)) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.tools.documents.request.unsupported", {
					data: { requestId },
				}),
				status: 400,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			request: { id: requestRes.data.id, type: requestRes.data.type },
			document,
		},
	};
};

export default resolveRequest;
