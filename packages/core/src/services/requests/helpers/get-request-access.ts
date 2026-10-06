import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import type { CollectionPermissionAction } from "../../../libs/permission/types.js";
import type { LucidUser } from "../../../types/hono.js";
import type { RequestPermissions } from "../../../types/response.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import type { RequestRecord } from "../types.js";
import allowsSelfApproval from "./allows-self-approval.js";
import canWriteDocument from "./can-write-document.js";

/**
 * Works out what a user can do with a request. Actions need the matching
 * permission on every document's collection. Create requests land their
 * document in latest, so approving and completing them needs create access
 * in place of update and publish access.
 */
const getRequestAccess = (
	context: ServiceContext,
	data: {
		request: Pick<RequestRecord, "type" | "status" | "created_by"> & {
			documents: Array<{ collection_key: string }>;
		};
		user: LucidUser;
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
	const create = data.request.type === "create";

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
		approve:
			open &&
			can("review") &&
			can(create ? "create" : "update") &&
			selfApproval,
		request: open && can(create ? "create" : "publish"),
		reopen: read && data.request.status === "closed" && write,
	};
};

export default getRequestAccess;
