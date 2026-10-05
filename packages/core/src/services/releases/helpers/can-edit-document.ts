import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import type { LucidUser } from "../../../types/hono.js";
import type { ReleaseRecord } from "../types.js";

/**
 * Whether someone who can read a release can work on one of its documents,
 * eg. edit its proposal or acknowledge a changed target. It needs update
 * access to the document's collection while the release is open.
 */
const canEditDocument = (data: {
	release: Pick<ReleaseRecord, "status">;
	collectionKey: string;
	user: LucidUser;
}) =>
	data.release.status === "open" &&
	hasAccess({
		user: data.user,
		requiredPermissions: [
			getCollectionPermission(data.collectionKey, "update"),
		],
	});

export default canEditDocument;
