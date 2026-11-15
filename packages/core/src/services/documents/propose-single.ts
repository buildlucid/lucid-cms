import collections from "../../libs/collection/collections.js";
import type { DocumentBeforeUpsertHookOrigin } from "../../libs/hooks/types.js";
import { copy } from "../../libs/i18n/index.js";
import { RequestsRepository } from "../../libs/repositories/index.js";
import type { BrickInputSchema } from "../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import type { LucidActor } from "../../types/hono.js";
import type { DocumentVersionUpdateResponse } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import updateVersion from "../documents-versions/update-single.js";
import addDocuments from "../requests/add-documents.js";
import createRequest, {
	type RequestDetailsInput,
} from "../requests/create-single.js";
import getProposalVersionId from "../requests/helpers/get-proposal-version-id.js";
import getLatestAccess from "./helpers/get-latest-access.js";

/**
 * Saves changes as a proposal in a new or existing open update request. Requires the source
 * content ID to prevent overwriting newer latest edits.
 */
const proposeSingle: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			user: LucidActor;
			agentRunId?: string;
			/** A new update request's details, or the ID of an open update request to add the document to. */
			request: RequestDetailsInput | { id: number };
			bricks?: Array<BrickInputSchema>;
			fields?: Array<FieldInputSchema>;
			/** Latest's content ID when the changes were made. */
			baseContentId?: string;
			/** Why the document is saved, passed to `beforeUpsert` hooks. */
			origin?: DocumentBeforeUpsertHookOrigin;
			/** Callers that already hold the document's write claim. Only new requests can be opened under it. */
			skipDocumentWriteClaims?: boolean;
		},
	],
	{ requestId: number; version: DocumentVersionUpdateResponse }
> = async (context, data) => {
	const Requests = new RequestsRepository(context.db);

	const collectionRes = await collections.getSingle(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	//* people who save latest directly can propose changes too
	if (getLatestAccess(collectionRes.data, data.user) === null) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.update.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	let requestId: number;
	if ("id" in data.request) {
		const requestRes = await Requests.selectSingle({
			select: ["type"],
			where: [{ key: "id", operator: "=", value: data.request.id }],
		});
		if (requestRes.error) return requestRes;
		if (requestRes.data?.type !== "update") {
			return {
				error: {
					type: "basic",
					message: copy("server:core.requests.update.existing.invalid"),
					status: 400,
				},
				data: undefined,
			};
		}

		const addedRes = await addDocuments(context, {
			id: data.request.id,
			documents: [
				{ collectionKey: data.collectionKey, documentId: data.documentId },
			],
			user: data.user,
			agentRunId: data.agentRunId,
		});
		if (addedRes.error) return addedRes;

		requestId = data.request.id;
	} else {
		const createdRes = await createRequest(context, {
			type: "update",
			...data.request,
			documents: [
				{ collectionKey: data.collectionKey, documentId: data.documentId },
			],
			user: data.user,
			agentRunId: data.agentRunId,
			skipDocumentWriteClaims: data.skipDocumentWriteClaims,
		});
		if (createdRes.error) return createdRes;

		requestId = createdRes.data.id;
	}

	const versionIdRes = await getProposalVersionId(context, {
		requestId,
		collectionKey: data.collectionKey,
		documentId: data.documentId,
	});
	if (versionIdRes.error) return versionIdRes;
	const versionId = versionIdRes.data;

	//* a new proposal shares latest's content ID, so the base still matches only when latest hasn't changed
	const versionRes = await updateVersion(context, {
		collectionKey: data.collectionKey,
		documentId: data.documentId,
		versionId,
		userId: data.user.id,
		authUser: data.user,
		agentRunId: data.agentRunId,
		origin: data.origin,
		baseContentId: data.baseContentId,
		skipDocumentWriteClaims: data.skipDocumentWriteClaims,
		bricks: data.bricks,
		fields: data.fields,
	});
	if (versionRes.error) return versionRes;

	return {
		error: undefined,
		data: { requestId, version: versionRes.data },
	};
};

export default proposeSingle;
