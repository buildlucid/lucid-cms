import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import type { CollectionPermissionAction } from "../../../libs/permission/types.js";
import type { LucidActor } from "../../../types/hono.js";
import type { RequestPermissions } from "../../../types/response.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import type { RequestRecord } from "../types.js";
import allowsSelfApproval from "./allows-self-approval.js";
import canWriteDocument from "./can-write-document.js";
import requestTypePermissions from "./request-type-permissions.js";

/** Determines request actions allowed by the user's permissions across every document's collection. */
const getRequestAccess = (
	context: ServiceContext,
	data: {
		request: Pick<RequestRecord, "type" | "status" | "created_by"> & {
			documents: Array<{ collection_key: string }>;
		};
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
	const permissions = requestTypePermissions[data.request.type];

	const read =
		hasAccess({
			user: data.user,
			requiredPermissions: [Permissions.RequestsRead],
		}) && can("read");
	const open = read && data.request.status === "open";
	//* super admins can always approve, including their own requests
	const selfApproval =
		data.user.superAdmin ||
		data.request.created_by !== data.user.id ||
		allowsSelfApproval(context, collectionKeys);

	return {
		read,
		edit: open && write,
		approve: open && can("review") && can(permissions.approve) && selfApproval,
		request: open && can(permissions.complete),
		reopen: read && data.request.status === "closed" && write,
	};
};

export default getRequestAccess;
