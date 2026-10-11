import {
	AgentDocumentReferencesRepository,
	AgentMediaReferencesRepository,
	AgentRequestReferencesRepository,
} from "../../../libs/repositories/index.js";
import type { AgentReferenceInput } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Lists tool-linked chat references created since the cutoff, excluding existing links whose creation times remain unchanged. */
const listAdded: ServiceFn<
	[{ conversationId: string; since: string }],
	AgentReferenceInput[]
> = async (context, input) => {
	const Media = new AgentMediaReferencesRepository(context.db);
	const Documents = new AgentDocumentReferencesRepository(context.db);
	const Requests = new AgentRequestReferencesRepository(context.db);

	const [media, documents, requests] = await Promise.all([
		Media.selectMultiple({
			select: ["media_id"],
			where: [
				{ key: "conversation_id", operator: "=", value: input.conversationId },
				{ key: "source", operator: "=", value: "tool" },
				{ key: "created_at", operator: ">=", value: input.since },
			],
			orderBy: [{ column: "created_at", direction: "asc" }],
			validation: { enabled: true },
		}),
		Documents.selectMultiple({
			select: ["collection_key", "document_id", "version_id"],
			where: [
				{ key: "conversation_id", operator: "=", value: input.conversationId },
				{ key: "source", operator: "=", value: "tool" },
				{ key: "created_at", operator: ">=", value: input.since },
			],
			orderBy: [{ column: "created_at", direction: "asc" }],
			validation: { enabled: true },
		}),
		Requests.selectMultiple({
			select: ["request_id"],
			where: [
				{ key: "conversation_id", operator: "=", value: input.conversationId },
				{ key: "source", operator: "=", value: "tool" },
				{ key: "created_at", operator: ">=", value: input.since },
			],
			orderBy: [{ column: "created_at", direction: "asc" }],
			validation: { enabled: true },
		}),
	]);
	if (media.error) return media;
	if (documents.error) return documents;
	if (requests.error) return requests;

	return {
		error: undefined,
		data: [
			...documents.data.map((row) => ({
				type: "document" as const,
				collectionKey: row.collection_key,
				documentId: row.document_id,
				...(row.version_id === null ? {} : { versionId: row.version_id }),
			})),
			...requests.data.map((row) => ({
				type: "request" as const,
				requestId: row.request_id,
			})),
			...media.data.map((row) => ({
				type: "media" as const,
				mediaId: row.media_id,
			})),
		],
	};
};

export default listAdded;
