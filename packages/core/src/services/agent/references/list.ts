import { canReadReference } from "../../../libs/agent/references.js";
import {
	AgentDocumentReferencesRepository,
	AgentMediaReferencesRepository,
} from "../../../libs/repositories/index.js";
import type {
	AgentReferenceInput,
	AgentReferenceSource,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import resolveUserAccess from "../../users/resolve-access.js";
import mediaOwnership from "./media-ownership.js";

export type AgentReferenceLink = AgentReferenceInput & {
	id: string;
	source: AgentReferenceSource;
};

const linkSource = (row: {
	source: "message" | "tool";
	tool_name: string | null;
}): AgentReferenceSource =>
	row.source === "tool" && row.tool_name
		? { type: "tool", toolName: row.tool_name }
		: { type: "message" };

/** Lists linked identities the current principal can read, without fetching resource contents. */
const list: ServiceFn<
	[{ conversationId: string; userId: number | null }],
	AgentReferenceLink[]
> = async (context, input) => {
	const access =
		input.userId === null
			? undefined
			: await resolveUserAccess(context, { userId: input.userId });
	if (access?.error) return access;
	const Media = new AgentMediaReferencesRepository(context.db);
	const Documents = new AgentDocumentReferencesRepository(context.db);

	const [media, documents] = await Promise.all([
		Media.selectMultiple({
			select: ["id", "media_id", "source", "tool_name"],
			where: [
				{ key: "conversation_id", operator: "=", value: input.conversationId },
			],
			orderBy: [
				{ column: "created_at", direction: "asc" },
				{ column: "id", direction: "asc" },
			],
			validation: { enabled: true },
		}),
		Documents.selectMultiple({
			select: [
				"id",
				"collection_key",
				"document_id",
				"version_id",
				"source",
				"tool_name",
			],
			where: [
				{ key: "conversation_id", operator: "=", value: input.conversationId },
			],
			orderBy: [
				{ column: "created_at", direction: "asc" },
				{ column: "id", direction: "asc" },
			],
			validation: { enabled: true },
		}),
	]);
	if (media.error) return media;
	if (documents.error) return documents;

	const ownership = await mediaOwnership(context, {
		mediaIds: media.data.map((row) => row.media_id),
	});
	if (ownership.error) return ownership;

	const links: AgentReferenceLink[] = [
		...media.data.map((row) => ({
			id: row.id,
			type: "media" as const,
			mediaId: row.media_id,
			source: linkSource(row),
		})),
		...documents.data.map((row) => ({
			id: row.id,
			type: "document" as const,
			collectionKey: row.collection_key,
			documentId: row.document_id,
			...(row.version_id === null ? {} : { versionId: row.version_id }),
			source: linkSource(row),
		})),
	];

	return {
		error: undefined,
		data: links.filter((reference) =>
			canReadReference({
				reference,
				ownership:
					reference.type === "media"
						? ownership.data.get(reference.mediaId)
						: undefined,
				userId: input.userId,
				grant: access?.data,
			}),
		),
	};
};

export default list;
