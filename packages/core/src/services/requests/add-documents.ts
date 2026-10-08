import { copy } from "../../libs/i18n/index.js";
import { RequestEventsRepository } from "../../libs/repositories/index.js";
import type { RequestDocumentInput } from "../../schemas/requests.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import acquireRequestWrites from "./helpers/acquire-request-writes.js";
import captureDocument from "./helpers/capture-document.js";
import checkRequestSize from "./helpers/check-request-size.js";
import dismissApproval from "./helpers/dismiss-approval.js";
import getRequestAccess from "./helpers/get-request-access.js";

/** Adds documents to a request and resets its approvals, capturing source content for publish requests. */
const addDocuments: ServiceFn<
	[{ id: number; documents: RequestDocumentInput[]; user: LucidUser }],
	undefined
> = async (context, data) => {
	const RequestEvents = new RequestEventsRepository(context.db);

	const claimRes = await acquireRequestWrites(context, {
		id: data.id,
		user: data.user,
		additionalDocuments: data.documents,
	});
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

	const keys = [
		...request.documents.map(
			(document) => `${document.collection_key}:${document.document_id}`,
		),
		...data.documents.map(
			(document) => `${document.collectionKey}:${document.documentId}`,
		),
	];
	if (new Set(keys).size !== keys.length) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.document.duplicate"),
				status: 409,
			},
			data: undefined,
		};
	}

	const sizeRes = checkRequestSize(keys.length);
	if (sizeRes.error) return sizeRes;

	for (const document of data.documents) {
		const captureRes = await captureDocument(context, {
			...document,
			request: { id: request.id, type: request.type },
			user: data.user,
			skipDocumentWriteClaims: true,
		});
		if (captureRes.error) return captureRes;
	}

	const dismissRes = await dismissApproval(context, {
		ids: [request.id],
		userId: data.user.id,
	});
	if (dismissRes.error) return dismissRes;

	const eventsRes = await RequestEvents.createEvents({
		data: data.documents.map((document) => ({
			request_id: request.id,
			user_id: data.user.id,
			type: "document_added" as const,
			metadata: {
				collectionKey: document.collectionKey,
				documentId: document.documentId,
			},
		})),
	});
	if (eventsRes.error) return eventsRes;

	return { error: undefined, data: undefined };
};

export default addDocuments;
