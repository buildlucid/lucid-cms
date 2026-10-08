import type { RequestType } from "../../../libs/db/tables/requests.js";
import type { CollectionPermissionAction } from "../../../libs/permission/types.js";

/**
 * The collection permissions each request type needs. `write` covers making
 * and editing the request, and `ownWrite` also lets its creator edit it.
 * Approving also needs `review`, and `complete` covers completing and
 * scheduling.
 */
const requestTypePermissions: Record<
	RequestType,
	{
		write: CollectionPermissionAction;
		ownWrite?: CollectionPermissionAction;
		approve: CollectionPermissionAction;
		complete: CollectionPermissionAction;
	}
> = {
	create: {
		write: "create",
		ownWrite: "create-request",
		approve: "create",
		complete: "create",
	},
	publish: { write: "update", approve: "update", complete: "publish" },
	unpublish: {
		write: "update",
		ownWrite: "unpublish-request",
		approve: "update",
		complete: "publish",
	},
	delete: {
		write: "delete",
		ownWrite: "delete-request",
		approve: "delete",
		complete: "delete",
	},
};

export default requestTypePermissions;
