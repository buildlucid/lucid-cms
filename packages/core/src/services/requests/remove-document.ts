import executeHooks from "../../libs/hooks/execute-hooks.js";
import { copy } from "../../libs/i18n/index.js";
import {
	RequestDocumentsRepository,
	RequestEventsRepository,
} from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import acquireRequestWrites from "./helpers/acquire-request-writes.js";
import deleteVersions from "./helpers/delete-versions.js";
import dismissApproval from "./helpers/dismiss-approval.js";
import getRequestAccess from "./helpers/get-request-access.js";

/**
 * Removes a document and its private versions, then tells documentRemoved
 * hooks what the request still holds. A request always keeps one document.
 */
const removeDocument: ServiceFn<
	[{ id: number; requestDocumentId: number; user: LucidUser }],
	undefined
> = async (context, data) => {
	const RequestDocuments = new RequestDocumentsRepository(context.db);
	const RequestEvents = new RequestEventsRepository(context.db);

	const claimRes = await acquireRequestWrites(context, data);
	if (claimRes.error) return claimRes;
	await using _claims = claimRes.data.claims;

	const request = claimRes.data.request;
	if (!getRequestAccess(context, { request, user: data.user }).edit) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	if (request.type === "create") {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.create.fixed"),
				status: 400,
			},
			data: undefined,
		};
	}

	const document = request.documents.find(
		(document) => document.id === data.requestDocumentId,
	);
	if (!document) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.document.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	if (request.documents.length === 1) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.document.last"),
				status: 400,
			},
			data: undefined,
		};
	}

	const deleteRes = await RequestDocuments.deleteSingle({
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
		ids: [request.id],
		userId: data.user.id,
	});
	if (dismissRes.error) return dismissRes;

	const eventsRes = await RequestEvents.createEvents({
		data: [
			{
				request_id: request.id,
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
		{ service: "requests", event: "documentRemoved", config: context.config },
		{
			meta: { userId: data.user.id },
			data: {
				request: {
					id: request.id,
					documents: request.documents.flatMap((member) =>
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
