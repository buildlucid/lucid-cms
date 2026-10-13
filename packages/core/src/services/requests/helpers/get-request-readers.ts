import { usersFormatter } from "../../../libs/formatters/index.js";
import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import type { CollectionPermissionAction } from "../../../libs/permission/types.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { UserDisplay } from "../../../types/response.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { RequestDocumentRecord } from "../types.js";

/** Lists request readers eligible for mentions, with optional user and collection-action filters. */
const getRequestReaders: ServiceFn<
	[
		{
			request: {
				documents: Array<Pick<RequestDocumentRecord, "collection_key">>;
			};
			/** Collection actions people also need on every document's collection, eg. to approve. */
			actions?: CollectionPermissionAction[];
			ids?: number[];
			name?: string;
			limit?: number;
		},
	],
	UserDisplay[]
> = async (context, data) => {
	const Users = new UsersRepository(context.db);

	const collectionKeys = [
		...new Set(
			data.request.documents.map((document) => document.collection_key),
		),
	];

	const usersRes = await Users.selectMultipleWithPermission({
		permissions: [
			Permissions.RequestsRead,
			...collectionKeys.flatMap((key) =>
				["read" as const, ...(data.actions ?? [])].map((action) =>
					getCollectionPermission(key, action),
				),
			),
		],
		ids: data.ids,
		name: data.name,
		limit: data.limit,
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

export default getRequestReaders;
