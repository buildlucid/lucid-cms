import { canReadReference } from "../../../libs/agent/references.js";
import {
	AgentDocumentReferencesRepository,
	AgentMediaReferencesRepository,
	AgentRequestReferencesRepository,
} from "../../../libs/repositories/index.js";
import type {
	AgentReferenceInput,
	AgentReferenceSource,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import resolveUserAccess from "../../users/resolve-access.js";
import mediaOwnership from "./media-ownership.js";
import requestCollections from "./request-collections.js";

export type AgentReferenceLink = AgentReferenceInput & {
	id: string;
	source: AgentReferenceSource;
	managed: boolean;
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
	const Requests = new AgentRequestReferencesRepository(context.db);

	const [media, documents, requests] = await Promise.all([
		Media.selectMultiple({
			select: ["id", "media_id", "source", "tool_name", "managed"],
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
				"managed",
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
		Requests.selectMultiple({
			select: ["id", "request_id", "source", "tool_name", "managed"],
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
	if (requests.error) return requests;

	const [ownership, collections] = await Promise.all([
		mediaOwnership(context, {
			mediaIds: media.data.map((row) => row.media_id),
		}),
		requestCollections(context, {
			requestIds: requests.data.map((row) => row.request_id),
		}),
	]);
	if (ownership.error) return ownership;
	if (collections.error) return collections;

	const links: AgentReferenceLink[] = [
		...media.data.map((row) => ({
			id: row.id,
			type: "media" as const,
			mediaId: row.media_id,
			source: linkSource(row),
			managed: Boolean(row.managed),
		})),
		...documents.data.map((row) => ({
			id: row.id,
			type: "document" as const,
			collectionKey: row.collection_key,
			documentId: row.document_id,
			...(row.version_id === null ? {} : { versionId: row.version_id }),
			source: linkSource(row),
			managed: Boolean(row.managed),
		})),
		...requests.data.map((row) => ({
			id: row.id,
			type: "request" as const,
			requestId: row.request_id,
			source: linkSource(row),
			managed: Boolean(row.managed),
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
				requestCollections:
					reference.type === "request"
						? collections.data.get(reference.requestId)
						: undefined,
				userId: input.userId,
				grant: access?.data,
			}),
		),
	};
};

export default list;
