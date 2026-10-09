import { referenceKey } from "../../../libs/agent/references.js";
import {
	AgentDocumentReferencesRepository,
	AgentMediaReferencesRepository,
	AgentRequestReferencesRepository,
} from "../../../libs/repositories/index.js";
import type {
	AgentReferenceInput,
	AgentReferenceSnapshot,
	AgentReferenceSource,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import describe from "./describe.js";
import linkRequestedDocuments from "./link-requested-documents.js";
import referenceNotFound from "./reference-not-found.js";

/** Links resources without granting access, substituting create requests for pending documents. */
const register: ServiceFn<
	[
		{
			conversationId: string;
			references: AgentReferenceInput[];
			source: AgentReferenceSource;
			skipMissing?: boolean;
			managed?: boolean;
		},
	],
	AgentReferenceSnapshot[]
> = async (context, input) => {
	const linked = await linkRequestedDocuments(context, {
		references: input.references,
	});
	if (linked.error) return linked;

	const references = [
		...new Map(
			linked.data.map((reference) => [referenceKey(reference), reference]),
		).values(),
	];
	if (!references.length) return { error: undefined, data: [] };

	const details = await describe(context, { references });
	if (details.error) return details;

	const snapshots: AgentReferenceSnapshot[] = [];
	for (const reference of references) {
		const detail = details.data.get(referenceKey(reference));
		if (!detail) {
			if (input.skipMissing) continue;
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 404,
					message: referenceNotFound(reference),
				},
			};
		}

		snapshots.push({
			...reference,
			label: detail.label,
			...(detail.mimeType ? { mimeType: detail.mimeType } : {}),
		});
	}

	const mediaIds = snapshots.flatMap((reference) =>
		reference.type === "media" ? [reference.mediaId] : [],
	);
	const documents = snapshots.filter(
		(reference) => reference.type === "document",
	);
	const requestIds = snapshots.flatMap((reference) =>
		reference.type === "request" ? [reference.requestId] : [],
	);
	const toolName =
		input.source.type === "tool" ? input.source.toolName : undefined;
	const Media = new AgentMediaReferencesRepository(context.db);
	const Documents = new AgentDocumentReferencesRepository(context.db);
	const Requests = new AgentRequestReferencesRepository(context.db);

	const [media, documentLinks, requestLinks] = await Promise.all([
		mediaIds.length
			? Media.register({
					conversationId: input.conversationId,
					mediaIds,
					source: input.source.type,
					toolName,
					managed: input.managed,
				})
			: undefined,
		documents.length
			? Documents.register({
					conversationId: input.conversationId,
					documents,
					source: input.source.type,
					toolName,
					managed: input.managed,
				})
			: undefined,
		requestIds.length
			? Requests.register({
					conversationId: input.conversationId,
					requestIds,
					source: input.source.type,
					toolName,
					managed: input.managed,
				})
			: undefined,
	]);
	if (media?.error) return media;
	if (documentLinks?.error) return documentLinks;
	if (requestLinks?.error) return requestLinks;

	return { error: undefined, data: snapshots };
};

export default register;
