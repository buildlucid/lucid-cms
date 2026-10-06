import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import type { LucidUser } from "../../../types/hono.js";
import type { RequestRecord } from "../types.js";

/**
 * Whether someone has write access to one of a request's documents, whatever
 * the request's status. Publish requests need update access to the document's
 * collection. Create requests are part of creating a document, so they need
 * create access, or for the person who made the request, request access.
 */
const canWriteDocument = (data: {
	request: Pick<RequestRecord, "type" | "created_by">;
	collectionKey: string;
	user: LucidUser;
}) => {
	if (data.request.type === "publish") {
		return hasAccess({
			user: data.user,
			requiredPermissions: [
				getCollectionPermission(data.collectionKey, "update"),
			],
		});
	}

	return hasAccess({
		user: data.user,
		optionalPermissions: [
			getCollectionPermission(data.collectionKey, "create"),
			...(data.request.created_by === data.user.id
				? [getCollectionPermission(data.collectionKey, "create-request")]
				: []),
		],
	});
};

export default canWriteDocument;
