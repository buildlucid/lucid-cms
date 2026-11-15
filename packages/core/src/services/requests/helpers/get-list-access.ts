import type { RequestType } from "../../../libs/db/tables/requests.js";
import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import { limitCollections } from "../../../libs/permission/readable-collections.js";
import type { CollectionPermissionAction } from "../../../libs/permission/types.js";
import type { LucidActor } from "../../../types/hono.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import requestTypePermissions from "./request-type-permissions.js";

/**
 * Resolves request visibility for lists and counts, requiring every document to belong to the
 * supplied collections. Mirrors `canReadRequest` for queries.
 */
const getListAccess = (
	context: ServiceContext,
	user: LucidActor,
	only?: readonly string[],
) => {
	const collectionKeys = (action: CollectionPermissionAction) =>
		user.superAdmin && !only
			? null
			: limitCollections(context.config.collections, only)
					.filter((collection) =>
						hasAccess({
							user,
							requiredPermissions: [
								getCollectionPermission(collection.key, action),
							],
						}),
					)
					.map((collection) => collection.key);

	const editKeys = (action: "update" | "publish") => {
		const any = collectionKeys(action);
		return {
			any,
			//* the direct permission also covers people's own requests
			own:
				any === null
					? null
					: [
							...new Set([
								...any,
								...(collectionKeys(`${action}-request`) ?? []),
							]),
						],
		};
	};

	const actionKeys = (type: RequestType) =>
		collectionKeys(requestTypePermissions(type).action);

	return {
		userId: user.id,
		collectionKeys: collectionKeys("read"),
		involvement: hasAccess({
			user,
			requiredPermissions: [Permissions.RequestsRead],
		})
			? null
			: {
					reviewKeys: collectionKeys("review"),
					actionKeys: {
						create: actionKeys("create"),
						update: actionKeys("update"),
						publish: actionKeys("publish"),
						unpublish: actionKeys("unpublish"),
						delete: actionKeys("delete"),
					},
				},
		editKeys: { update: editKeys("update"), publish: editKeys("publish") },
	};
};

export default getListAccess;
