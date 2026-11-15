import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import type { LucidActor } from "../../../types/hono.js";
import type { RequestRecord } from "../types.js";
import requestTypePermissions from "./request-type-permissions.js";

/** Checks the collection access required to edit a request document: its type's action for anyone's request, or the request permission for its creator. */
const canWriteDocument = (data: {
	request: Pick<RequestRecord, "type" | "created_by">;
	collectionKey: string;
	user: LucidActor;
}) => {
	const permissions = requestTypePermissions(data.request.type);

	return hasAccess({
		user: data.user,
		optionalPermissions: [
			getCollectionPermission(data.collectionKey, permissions.action),
			...(data.request.created_by === data.user.id
				? [getCollectionPermission(data.collectionKey, permissions.request)]
				: []),
		],
	});
};

export default canWriteDocument;
