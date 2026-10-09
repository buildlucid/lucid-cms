import {
	AgentDocumentReferencesRepository,
	AgentMediaReferencesRepository,
	AgentRequestReferencesRepository,
} from "../../../libs/repositories/index.js";
import type { AgentReferenceInput } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Unlinks resources from a chat however they were linked, including managed
 * links. Messages keep what was attached. Unlinking a missing link succeeds.
 */
const unlink: ServiceFn<
	[{ conversationId: string; references: AgentReferenceInput[] }],
	undefined
> = async (context, input) => {
	const mediaIds = input.references.flatMap((reference) =>
		reference.type === "media" ? [reference.mediaId] : [],
	);
	const documents = input.references.filter(
		(reference) => reference.type === "document",
	);
	const requestIds = input.references.flatMap((reference) =>
		reference.type === "request" ? [reference.requestId] : [],
	);
	const Media = new AgentMediaReferencesRepository(context.db);
	const Documents = new AgentDocumentReferencesRepository(context.db);
	const Requests = new AgentRequestReferencesRepository(context.db);

	const [media, documentLinks, requestLinks] = await Promise.all([
		mediaIds.length
			? Media.deleteMultiple({
					where: [
						{
							key: "conversation_id",
							operator: "=",
							value: input.conversationId,
						},
						{ key: "media_id", operator: "in", value: mediaIds },
					],
				})
			: undefined,
		documents.length
			? Documents.unlink({ conversationId: input.conversationId, documents })
			: undefined,
		requestIds.length
			? Requests.deleteMultiple({
					where: [
						{
							key: "conversation_id",
							operator: "=",
							value: input.conversationId,
						},
						{ key: "request_id", operator: "in", value: requestIds },
					],
				})
			: undefined,
	]);
	if (media?.error) return media;
	if (documentLinks?.error) return documentLinks;
	if (requestLinks?.error) return requestLinks;

	return { error: undefined, data: undefined };
};

export default unlink;
