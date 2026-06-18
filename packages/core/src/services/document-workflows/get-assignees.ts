import type { DocumentWorkflowAssignee } from "@lucidcms/types";
import { documentWorkflowsFormatter } from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { resolveCollectionPermission } from "../../libs/permission/collection-permissions.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getCollectionInstance from "../collections/get-single-instance.js";
import { getWorkflowConfig } from "./helpers/index.js";

const getAssignees: ServiceFn<
	[
		{
			collectionKey: string;
		},
	],
	Array<DocumentWorkflowAssignee["user"]>
> = async (context, data) => {
	const collectionRes = getCollectionInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	if (!getWorkflowConfig(collectionRes.data)) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.workflows.not.enabled"),
				status: 400,
			},
			data: undefined,
		};
	}

	const permission = resolveCollectionPermission({
		collection: collectionRes.data,
		action: "update",
	});

	const Users = new UsersRepository(context.db.client, context.config.db);
	const usersRes = await Users.selectMultipleWithPermission({
		permission,
		tenantKey: context.request.tenantKey,
	});
	if (usersRes.error) return usersRes;

	return {
		error: undefined,
		data: documentWorkflowsFormatter.formatAssigneeUsers({
			users: usersRes.data ?? [],
			host: getBaseUrl(context),
		}),
	};
};

export default getAssignees;
