import type { RequestType } from "../../../libs/db/tables/requests.js";
import type { RequestableAction } from "../../../libs/permission/collection-permissions.js";

/**
 * Maps request types to actions. Direct permission allows completion and editing any request;
 * `-request` allows creators to edit their own. Approval requires `review`. Unpublish uses publish
 * permissions.
 */
const requestTypeActions = {
	create: "create",
	update: "update",
	publish: "publish",
	unpublish: "publish",
	delete: "delete",
} as const satisfies Record<RequestType, RequestableAction>;

/** The collection permissions a request type needs, eg. `update` and `update-request` for update requests. */
const requestTypePermissions = <TType extends RequestType>(type: TType) => {
	const action = requestTypeActions[type];
	return {
		action,
		request: `${action}-request` as const,
	};
};

export default requestTypePermissions;
