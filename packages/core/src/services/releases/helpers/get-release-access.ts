import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import type { LucidUser } from "../../../types/hono.js";
import type { ReleasePermissions } from "../../../types/response.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import type { ReleaseRecord } from "../types.js";
import allowsSelfApproval from "./allows-self-approval.js";

/**
 * Works out what a user can do with a release. Actions need the matching
 * permission on every document's collection.
 */
const getReleaseAccess = (
	context: ServiceContext,
	data: {
		release: Pick<ReleaseRecord, "status" | "created_by"> & {
			documents: Array<{ collection_key: string }>;
		};
		user: LucidUser;
	},
): ReleasePermissions & { read: boolean } => {
	const collectionKeys = [
		...new Set(
			data.release.documents.map((document) => document.collection_key),
		),
	];
	const can = (action: "read" | "update" | "review" | "publish"): boolean =>
		hasAccess({
			user: data.user,
			requiredPermissions: collectionKeys.map((key) =>
				getCollectionPermission(key, action),
			),
		});

	const read =
		hasAccess({
			user: data.user,
			requiredPermissions: [Permissions.ReleasesRead],
		}) && can("read");
	const open = read && data.release.status === "open";
	//* super admins can always approve, including their own releases
	const selfApproval =
		data.user.superAdmin ||
		data.release.created_by !== data.user.id ||
		allowsSelfApproval(context, collectionKeys);

	return {
		read,
		edit: open && can("update"),
		approve: open && can("review") && can("update") && selfApproval,
		release: open && can("publish"),
		reopen: read && data.release.status === "closed" && can("update"),
	};
};

export default getReleaseAccess;
