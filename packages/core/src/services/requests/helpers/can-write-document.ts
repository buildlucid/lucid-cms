import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import type { LucidUser } from "../../../types/hono.js";
import type { RequestRecord } from "../types.js";
import requestTypePermissions from "./request-type-permissions.js";

/** Checks the collection access required to edit a request document, including request access for its creator. */
const canWriteDocument = (data: {
	request: Pick<RequestRecord, "type" | "created_by">;
	collectionKey: string;
	user: LucidUser;
}) => {
	const { write, ownWrite } = requestTypePermissions[data.request.type];

	return hasAccess({
		user: data.user,
		optionalPermissions: [
			getCollectionPermission(data.collectionKey, write),
			...(ownWrite && data.request.created_by === data.user.id
				? [getCollectionPermission(data.collectionKey, ownWrite)]
				: []),
		],
	});
};

export default canWriteDocument;
