import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import type { CollectionPermissionAction } from "../../../libs/permission/types.js";
import type { LucidActor } from "../../../types/hono.js";
import type { RequestPermissions } from "../../../types/response.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import type { RequestRecord } from "../types.js";
import allowsSelfApproval from "./allows-self-approval.js";
import canReadRequest, { type RequestReadFacts } from "./can-read-request.js";
import canWriteDocument from "./can-write-document.js";
import requestTypePermissions from "./request-type-permissions.js";

/**
 * Resolves actions across all included collections. Uses `canReadRequest` for visibility; creators
 * may close their open requests. Approval requires `review`; completion requires the request
 * type's action.
 */
const getRequestAccess = (
	context: ServiceContext,
	data: {
		request: RequestReadFacts & Pick<RequestRecord, "status">;
		user: LucidActor;
	},
): RequestPermissions & { read: boolean } => {
	const collectionKeys = [
		...new Set(
			data.request.documents.map((document) => document.collection_key),
		),
	];
	const can = (action: CollectionPermissionAction): boolean =>
		hasAccess({
			user: data.user,
			requiredPermissions: collectionKeys.map((key) =>
				getCollectionPermission(key, action),
			),
		});
	const write = collectionKeys.every((collectionKey) =>
		canWriteDocument({
			request: data.request,
			collectionKey,
			user: data.user,
		}),
	);
	const { action } = requestTypePermissions(data.request.type);

	const read = canReadRequest({
		request: data.request,
		userId: data.user.id,
		grant: {
			superAdmin: data.user.superAdmin,
			permissions: data.user.permissions ?? [],
		},
	});
	const open = read && data.request.status === "open";
	//* super admins can always approve, including their own requests
	const selfApproval =
		data.user.superAdmin ||
		data.request.created_by !== data.user.id ||
		allowsSelfApproval(context, collectionKeys);

	return {
		read,
		edit: open && write,
		//* people can always withdraw their own requests, even after losing the permission to change them
		close: open && (write || data.request.created_by === data.user.id),
		approve: open && can("review") && selfApproval,
		complete: open && can(action),
		reopen: read && data.request.status === "closed" && write,
	};
};

export default getRequestAccess;
