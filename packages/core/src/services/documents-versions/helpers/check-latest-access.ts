import type CollectionDefinition from "../../../libs/collection/definitions/collection/index.js";
import { copy } from "../../../libs/i18n/index.js";
import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import type { LucidActor } from "../../../types/hono.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import getLatestAccess from "../../documents/helpers/get-latest-access.js";
import requiresReview from "../../documents/helpers/requires-review.js";
import type { UpdatePurpose } from "./get-update-context.js";

/**
 * Checks latest writes: content and alignment require direct access, workflow requires update, and
 * drafts allow direct or proposal access. System writes bypass permissions but still obey
 * mandatory review.
 */
const checkLatestAccess = (data: {
	collection: CollectionDefinition;
	user: LucidActor | undefined;
	purpose: UpdatePurpose;
}): Awaited<ServiceResponse<undefined>> => {
	if (
		(data.purpose === "content" || data.purpose === "align") &&
		requiresReview(data.collection, { type: "update" })
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.update.review.required"),
				status: 403,
			},
			data: undefined,
		};
	}
	if (!data.user) return { error: undefined, data: undefined };

	const allowed =
		data.purpose === "workflow"
			? hasAccess({
					user: data.user,
					requiredPermissions: [
						getCollectionPermission(data.collection.key, "update"),
					],
				})
			: data.purpose === "draft"
				? getLatestAccess(data.collection, data.user) !== null
				: getLatestAccess(data.collection, data.user) === "direct";
	if (allowed) return { error: undefined, data: undefined };

	return {
		error: {
			type: "basic",
			name: copy("server:core.collections.permission.error.name"),
			message: copy("server:core.collections.permission.error.message", {
				data: { collection: data.collection.key, action: "update" },
			}),
			status: 403,
		},
		data: undefined,
	};
};

export default checkLatestAccess;
