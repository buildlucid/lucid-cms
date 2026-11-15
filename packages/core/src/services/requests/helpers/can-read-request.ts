import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import hasPermission, {
	type PermissionGrant,
} from "../../../libs/permission/has-permission.js";
import type { CollectionPermissionAction } from "../../../libs/permission/types.js";
import type { RequestRecord } from "../types.js";
import requestTypePermissions from "./request-type-permissions.js";

export type RequestReadFacts = Pick<RequestRecord, "type" | "created_by"> & {
	documents: Array<{ collection_key: string }>;
	reviewers: Array<{ user_id: number }>;
};

/**
 * Requires read access to every included collection, plus request-wide read, per-collection
 * review/action access, authorship or reviewer membership. Lists and reader queries use the same
 * rule.
 */
const canReadRequest = (data: {
	request: RequestReadFacts;
	userId: number | null;
	grant: PermissionGrant;
}) => {
	const onEvery = (action: CollectionPermissionAction) =>
		data.request.documents.every((document) =>
			hasPermission(
				data.grant,
				getCollectionPermission(document.collection_key, action),
			),
		);

	return (
		onEvery("read") &&
		(hasPermission(data.grant, Permissions.RequestsRead) ||
			(data.userId !== null &&
				(data.request.created_by === data.userId ||
					data.request.reviewers.some(
						(reviewer) => reviewer.user_id === data.userId,
					))) ||
			onEvery("review") ||
			onEvery(requestTypePermissions(data.request.type).action))
	);
};

export default canReadRequest;
