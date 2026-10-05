import executeHooks from "../../libs/hooks/execute-hooks.js";
import { copy } from "../../libs/i18n/index.js";
import {
	ReleaseDocumentsRepository,
	ReleaseEventsRepository,
} from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import acquireReleaseWrites from "./helpers/acquire-release-writes.js";
import deleteVersions from "./helpers/delete-versions.js";
import dismissApproval from "./helpers/dismiss-approval.js";
import getReleaseAccess from "./helpers/get-release-access.js";

/**
 * Removes a document and its private versions, then tells documentRemoved
 * hooks what the release still holds. A release always keeps one document.
 */
const removeDocument: ServiceFn<
	[{ id: number; releaseDocumentId: number; user: LucidUser }],
	undefined
> = async (context, data) => {
	const ReleaseDocuments = new ReleaseDocumentsRepository(context.db);
	const ReleaseEvents = new ReleaseEventsRepository(context.db);

	const claimRes = await acquireReleaseWrites(context, data);
	if (claimRes.error) return claimRes;
	await using _claims = claimRes.data.claims;

	const release = claimRes.data.release;
	if (!getReleaseAccess(context, { release, user: data.user }).edit) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	const document = release.documents.find(
		(document) => document.id === data.releaseDocumentId,
	);
	if (!document) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.document.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	if (release.documents.length === 1) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.document.last"),
				status: 400,
			},
			data: undefined,
		};
	}

	const deleteRes = await ReleaseDocuments.deleteSingle({
		where: [{ key: "id", operator: "=", value: document.id }],
	});
	if (deleteRes.error) return deleteRes;

	const versionsRes = await deleteVersions(context, {
		collectionKey: document.collection_key,
		documentId: document.document_id,
		versionIds: [
			...new Set([document.source_version_id, document.approved_version_id]),
		].filter((id) => id !== null),
	});
	if (versionsRes.error) return versionsRes;

	const dismissRes = await dismissApproval(context, {
		ids: [release.id],
		userId: data.user.id,
	});
	if (dismissRes.error) return dismissRes;

	const eventsRes = await ReleaseEvents.createEvents({
		data: [
			{
				release_id: release.id,
				user_id: data.user.id,
				type: "document_removed",
				metadata: {
					collectionKey: document.collection_key,
					documentId: document.document_id,
				},
			},
		],
	});
	if (eventsRes.error) return eventsRes;

	return executeHooks(
		context,
		{ service: "releases", event: "documentRemoved", config: context.config },
		{
			meta: { userId: data.user.id },
			data: {
				release: {
					id: release.id,
					documents: release.documents.flatMap((member) =>
						member.id === document.id || member.source_version_id === null
							? []
							: [
									{
										collectionKey: member.collection_key,
										documentId: member.document_id,
										source: member.source,
										versionId: member.source_version_id,
									},
								],
					),
				},
				collectionKey: document.collection_key,
				documentId: document.document_id,
			},
		},
	);
};

export default removeDocument;
