import collections from "../../libs/collection/collections.js";
import { usersFormatter } from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { resolveCollectionPermission } from "../../libs/permission/collection-permissions.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { UserDisplay } from "../../types/response.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { getWorkflowConfig } from "./helpers/index.js";

const getAssignees: ServiceFn<
	[
		{
			collectionKey: string;
		},
	],
	UserDisplay[]
> = async (context, data) => {
	const collectionRes = await collections.getSingle(context, {
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

	const Users = new UsersRepository(context.db);
	const usersRes = await Users.selectMultipleWithPermission({
		permissions: [permission],
	});
	if (usersRes.error) return usersRes;

	const mediaOptions = {
		host: getBaseUrl(context),
		delivery: context.mediaDelivery,
		defaultLocale: context.config.localization.defaultLocale,
		locales: context.config.localization.locales,
	};

	return {
		error: undefined,
		data: (usersRes.data ?? []).map((user) =>
			usersFormatter.formatDisplay({ user, mediaOptions }),
		),
	};
};

export default getAssignees;
