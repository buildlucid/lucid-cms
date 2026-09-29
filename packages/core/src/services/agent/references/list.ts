import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import { Permissions } from "../../../libs/permission/definitions.js";
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
	const canRead = (permission: string) =>
		!access ||
		access.data.superAdmin ||
		access.data.permissions.includes(permission);
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

	const result: AgentReferenceLink[] = [];
	if (canRead(Permissions.MediaRead)) {
		for (const row of media.data) {
			result.push({
				id: row.id,
				type: "media",
				mediaId: row.media_id,
				source: linkSource(row),
			});
		}
	}

	for (const row of documents.data) {
		if (!canRead(getCollectionPermission(row.collection_key, "read"))) continue;
		result.push({
			id: row.id,
			type: "document",
			collectionKey: row.collection_key,
			documentId: row.document_id,
			...(row.version_id === null ? {} : { versionId: row.version_id }),
			source: linkSource(row),
		});
	}

	return { error: undefined, data: result };
};

export default list;
