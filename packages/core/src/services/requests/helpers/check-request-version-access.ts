import type { RequestType } from "../../../libs/db/tables/requests.js";
import type { DocumentHookRequest } from "../../../libs/hooks/types.js";
import { copy } from "../../../libs/i18n/index.js";
import { RequestsRepository } from "../../../libs/repositories/index.js";
import type { LucidActor } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import canEditDocument from "./can-edit-document.js";
import changesContent from "./changes-content.js";
import getHookRequest from "./get-hook-request.js";
import getRequestAccess from "./get-request-access.js";

/** The request that owns a proposal or snapshot, as hooks see it, with its type. */
export type RequestVersionOwner = DocumentHookRequest & { type: RequestType };

/**
 * Checks request access for captured versions. Open create/update proposals require document edit
 * access; publish copies can only be refreshed or moved through workflow with `manage`. Returns
 * the request and captured versions for relation resolution.
 */
const checkRequestVersionAccess: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			versionId: number;
			user?: LucidActor;
			edit?: "content" | "manage";
		},
	],
	RequestVersionOwner
> = async (context, data) => {
	const Requests = new RequestsRepository(context.db);

	if (!data.user) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.version.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const ownerRes = await Requests.selectVersionOwner({
		collectionKey: data.collectionKey,
		documentId: data.documentId,
		versionId: data.versionId,
	});
	if (ownerRes.error) return ownerRes;

	const owner = ownerRes.data;
	if (
		!owner ||
		!getRequestAccess(context, { request: owner, user: data.user }).read
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.version.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const request = { ...getHookRequest(owner), type: owner.type };
	if (!data.edit) return { error: undefined, data: request };

	if (
		owner.source !== "latest" ||
		owner.source_version_id !== data.versionId ||
		(data.edit === "content" && !changesContent(owner.type)) ||
		!canEditDocument({
			request: owner,
			collectionKey: data.collectionKey,
			user: data.user,
		})
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.proposal.locked"),
				status: 403,
			},
			data: undefined,
		};
	}

	return { error: undefined, data: request };
};

export default checkRequestVersionAccess;
