import { referenceKey } from "../../../libs/agent/references.js";
import { copy } from "../../../libs/i18n/index.js";
import {
	AgentDocumentReferencesRepository,
	AgentMediaReferencesRepository,
} from "../../../libs/repositories/index.js";
import type {
	AgentReferenceInput,
	AgentReferenceSnapshot,
	AgentReferenceSource,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import describe from "./describe.js";

/**
 * Links resources to a chat without changing them or granting access to them,
 * and returns what was linked with its current details. `skipMissing` leaves
 * out resources deleted since a message was queued, rather than failing it.
 */
const register: ServiceFn<
	[
		{
			conversationId: string;
			references: AgentReferenceInput[];
			source: AgentReferenceSource;
			skipMissing?: boolean;
		},
	],
	AgentReferenceSnapshot[]
> = async (context, input) => {
	const references = [
		...new Map(
			input.references.map((reference) => [referenceKey(reference), reference]),
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
					message:
						reference.type === "media"
							? copy("server:core.media.not.found.message")
							: copy("server:core.documents.not.found.message"),
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
	const toolName =
		input.source.type === "tool" ? input.source.toolName : undefined;
	const Media = new AgentMediaReferencesRepository(context.db);
	const Documents = new AgentDocumentReferencesRepository(context.db);

	const [media, documentLinks] = await Promise.all([
		mediaIds.length
			? Media.register({
					conversationId: input.conversationId,
					mediaIds,
					source: input.source.type,
					toolName,
				})
			: undefined,
		documents.length
			? Documents.register({
					conversationId: input.conversationId,
					documents,
					source: input.source.type,
					toolName,
				})
			: undefined,
	]);
	if (media?.error) return media;
	if (documentLinks?.error) return documentLinks;

	return { error: undefined, data: snapshots };
};

export default register;
