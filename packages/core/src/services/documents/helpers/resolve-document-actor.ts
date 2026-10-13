import collections from "../../../libs/collection/collections.js";
import { copy } from "../../../libs/i18n/index.js";
import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import type { ToolkitActor } from "../../../libs/permission/toolkit-actor.js";
import type { LucidUser } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import resolveActorUser from "../../users/helpers/resolve-actor-user.js";

/** Resolves live actor permissions at the toolkit boundary, leaving system actions without user attribution. */
const resolveDocumentActor: ServiceFn<
	[
		{
			actor: ToolkitActor;
			collectionKey: string;
			action: "read" | "create" | "update" | "delete";
		},
	],
	{ userId: number | null; authUser?: LucidUser; agentRunId?: string }
> = async (context, input) => {
	const collection = await collections.getSingle(context, {
		key: input.collectionKey,
	});
	if (collection.error) return collection;
	if (input.actor.type === "system") {
		return {
			data: { userId: null, agentRunId: input.actor.agentRunId },
			error: undefined,
		};
	}

	const userRes = await resolveActorUser(context, { actor: input.actor });
	if (userRes.error) return userRes;

	const authUser = userRes.data;

	if (
		!hasAccess({
			user: authUser,
			requiredPermissions: [
				getCollectionPermission(input.collectionKey, input.action),
			],
		})
	) {
		return {
			data: undefined,
			error: {
				status: 403,
				message: copy(
					"server:core.documents.authoring.actor.permission.denied",
				),
			},
		};
	}

	return {
		data: {
			userId: authUser.id,
			authUser,
			agentRunId: input.actor.agentRunId,
		},
		error: undefined,
	};
};

export default resolveDocumentActor;
