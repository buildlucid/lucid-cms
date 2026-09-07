import collections from "../../../libs/collection/collections.js";
import formatter, {
	userPermissionsFormatter,
} from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { DocumentActor } from "../../../libs/toolkit/documents/types.js";
import type { LucidUser } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";

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

	const Users = new UsersRepository(context.db);
	const user = await Users.selectAccessTokenUser({
		where: [
			{ key: "id", operator: "=", value: input.actor.userId },
			{
				key: "is_deleted",
				operator: "=",
				value: context.config.db.getDefault("boolean", "false"),
			},
			{
				key: "is_locked",
				operator: "=",
				value: context.config.db.getDefault("boolean", "false"),
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				status: 403,
				message: copy("server:core.documents.authoring.actor.access.denied"),
			},
		},
	});
	if (user.error) return user;

	const authUser: LucidUser = {
		id: user.data.id,
		username: user.data.username,
		email: user.data.email,
		superAdmin: formatter.formatBoolean(user.data.super_admin ?? false),
		permissions: userPermissionsFormatter.formatMultiple({
			roles: user.data.roles ?? [],
		}).permissions,
	};
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
