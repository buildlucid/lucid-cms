import collections from "../../libs/collection/collections.js";
import { copy } from "../../libs/i18n/index.js";
import { getCollectionPermission } from "../../libs/permission/collection-permissions.js";
import hasAccess from "../../libs/permission/has-access.js";
import type { LucidActor } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import unpublishVersion from "../documents-versions/unpublish-version.js";
import requiresReview from "./helpers/requires-review.js";

/** Unpublishes a document directly from an environment when review is not required. */
const unpublish: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			environment: string;
			user: LucidActor;
			agentRunId?: string;
		},
	],
	undefined
> = async (context, data) => {
	if (
		!hasAccess({
			user: data.user,
			requiredPermissions: [
				getCollectionPermission(data.collectionKey, "read"),
				getCollectionPermission(data.collectionKey, "publish"),
			],
		})
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.unpublish.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	const collectionRes = await collections.getSingle(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	if (
		requiresReview(collectionRes.data, {
			type: "unpublish",
			environment: data.environment,
		})
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.unpublish.review.required"),
				status: 403,
			},
			data: undefined,
		};
	}

	return unpublishVersion(context, {
		collectionKey: data.collectionKey,
		documentIds: [data.documentId],
		target: data.environment,
		userId: data.user.id,
		agentRunId: data.agentRunId,
	});
};

export default unpublish;
