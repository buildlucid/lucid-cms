import { usersFormatter } from "../../../libs/formatters/index.js";
import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import type { CollectionPermissionAction } from "../../../libs/permission/types.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { UserDisplay } from "../../../types/response.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { RequestReadFacts } from "./can-read-request.js";
import requestTypePermissions from "./request-type-permissions.js";

/**
 * Lists people who can read a request, with optional user and collection-action filters.
 * Matches `canReadRequest`: read on every document's collection, plus
 * `requests:read`, `review` or the type's action on each, or having made or been asked to review it.
 */
const getRequestReaders: ServiceFn<
	[
		{
			request: RequestReadFacts;
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

	const onEvery = (action: CollectionPermissionAction) =>
		collectionKeys.map((key) => getCollectionPermission(key, action));

	const usersRes = await Users.selectMultipleWithPermission({
		permissions: ["read" as const, ...(data.actions ?? [])].flatMap(onEvery),
		oneOf: {
			permissionSets: [
				[Permissions.RequestsRead],
				onEvery("review"),
				onEvery(requestTypePermissions(data.request.type).action),
			],
			userIds: [
				...(data.request.created_by === null ? [] : [data.request.created_by]),
				...data.request.reviewers.map((reviewer) => reviewer.user_id),
			],
		},
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
