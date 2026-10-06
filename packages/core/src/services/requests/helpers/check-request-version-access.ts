import type { DocumentHookRequest } from "../../../libs/hooks/types.js";
import { copy } from "../../../libs/i18n/index.js";
import { RequestsRepository } from "../../../libs/repositories/index.js";
import type { LucidUser } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import canEditDocument from "./can-edit-document.js";
import getRequestAccess from "./get-request-access.js";

/**
 * Request proposals and snapshots belong to one request. Reading them needs
 * access to that request, and editing a proposal needs edit access to its
 * document while the request is open. Returns the request and the versions it
 * has captured, so writes can resolve relations within the request.
 */
const checkRequestVersionAccess: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			versionId: number;
			user?: LucidUser;
			edit?: boolean;
		},
	],
	DocumentHookRequest
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

	const request: DocumentHookRequest = {
		id: owner.id,
		documents: owner.documents.flatMap((document) =>
			document.source_version_id === null
				? []
				: [
						{
							collectionKey: document.collection_key,
							documentId: document.document_id,
							source: document.source,
							versionId: document.source_version_id,
						},
					],
		),
	};
	if (!data.edit) return { error: undefined, data: request };

	if (
		owner.source !== "latest" ||
		owner.source_version_id !== data.versionId ||
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
