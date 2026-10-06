import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import type { LucidUser } from "../../../types/hono.js";
import type { ReleaseRecord } from "../types.js";

/**
 * Whether someone has write access to one of a release's documents, whatever
 * the release's status. Publish releases need update access to the document's
 * collection. Create releases are part of creating a document, so they need
 * create access, or for the person who made the request, request access.
 */
const canWriteDocument = (data: {
	release: Pick<ReleaseRecord, "type" | "created_by">;
	collectionKey: string;
	user: LucidUser;
}) => {
	if (data.release.type === "publish") {
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
			...(data.release.created_by === data.user.id
				? [getCollectionPermission(data.collectionKey, "create-request")]
				: []),
		],
	});
};

export default canWriteDocument;
