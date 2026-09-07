import type { RichTextValidationData } from "../../../libs/collection/custom-fields/fields/rich-text/types.js";
import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import type { LucidUser } from "../../../types/hono.js";

type RichTextVariableAccess = NonNullable<
	RichTextValidationData["variableAccess"]
>;

/** Resolves which variable resources an authenticated document editor may read. */
const resolveRichTextVariableAccess = (props: {
	collectionKeys: string[];
	user: LucidUser;
}): RichTextVariableAccess => ({
	documentCollectionKeys: props.collectionKeys.filter((collectionKey) =>
		hasAccess({
			user: props.user,
			requiredPermissions: [getCollectionPermission(collectionKey, "read")],
		}),
	),
	users: hasAccess({
		user: props.user,
		requiredPermissions: [Permissions.UsersRead],
	}),
});

export default resolveRichTextVariableAccess;
