import { documentWorkflowsFormatter } from "../../../libs/formatters/index.js";
import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { ReleaseUser } from "../../../types/response.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { ReleaseDocumentRecord } from "../types.js";

/** People who can read a release, and so can be mentioned in its comments. */
const getReleaseReaders: ServiceFn<
	[
		{
			release: {
				documents: Array<Pick<ReleaseDocumentRecord, "collection_key">>;
			};
		},
	],
	ReleaseUser[]
> = async (context, data) => {
	const Users = new UsersRepository(context.db);

	const collectionKeys = [
		...new Set(
			data.release.documents.map((document) => document.collection_key),
		),
	];

	const usersRes = await Users.selectMultipleWithPermission({
		permissions: [
			Permissions.ReleasesRead,
			...collectionKeys.map((key) => getCollectionPermission(key, "read")),
		],
	});
	if (usersRes.error) return usersRes;

	return {
		error: undefined,
		data: documentWorkflowsFormatter.formatAssigneeUsers({
			users: usersRes.data ?? [],
			mediaOptions: {
				host: getBaseUrl(context),
				delivery: context.mediaDelivery,
				defaultLocale: context.config.localization.defaultLocale,
				locales: context.config.localization.locales,
			},
		}),
	};
};

export default getReleaseReaders;
