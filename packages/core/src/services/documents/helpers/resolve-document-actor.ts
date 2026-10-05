import collections from "../../../libs/collection/collections.js";
import { copy } from "../../../libs/i18n/index.js";
import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import type { DocumentActor } from "../../../libs/toolkit/documents/types.js";
import type { LucidUser } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import loadActiveUser from "../../users/helpers/load-active-user.js";

/** Resolves live user permissions once at the toolkit boundary. System actors leave attribution empty. */
const resolveDocumentActor: ServiceFn<
	[
		{
			actor: DocumentActor;
			collectionKey: string;
			action: "read" | "create" | "update" | "delete";
		},
	],
	{ userId: number | null; authUser?: LucidUser }
> = async (context, input) => {
	const collection = await collections.getSingle(context, {
		key: input.collectionKey,
	});
	if (collection.error) return collection;
	if (input.actor.kind === "system") {
		return { data: { userId: null }, error: undefined };
	}

	const userRes = await loadActiveUser(context, { id: input.actor.userId });
	if (userRes.error) return userRes;

	const authUser = userRes.data;
	if (!authUser) {
		return {
			data: undefined,
			error: {
				status: 403,
				message: copy("server:core.documents.authoring.actor.access.denied"),
			},
		};
	}

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

	return { data: { userId: authUser.id, authUser }, error: undefined };
};

export default resolveDocumentActor;
