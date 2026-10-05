import { documentWorkflowsFormatter } from "../../../libs/formatters/index.js";
import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { ReleaseUser } from "../../../types/response.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { ReleaseDocumentRecord, ReleaseRecord } from "../types.js";
import allowsSelfApproval from "./allows-self-approval.js";

const getEligibleReviewers: ServiceFn<
	[
		{
			release: Pick<ReleaseRecord, "created_by"> & {
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
	const permissions = [
		Permissions.ReleasesRead,
		...collectionKeys.flatMap((key) => [
			getCollectionPermission(key, "read"),
			getCollectionPermission(key, "update"),
			getCollectionPermission(key, "review"),
		]),
	];
	const selfApproval = allowsSelfApproval(context, collectionKeys);

	const usersRes = await Users.selectMultipleWithPermission({ permissions });
	if (usersRes.error) return usersRes;

	return {
		error: undefined,
		data: documentWorkflowsFormatter.formatAssigneeUsers({
			users: (usersRes.data ?? []).filter(
				(user) => selfApproval || user.id !== data.release.created_by,
			),
			mediaOptions: {
				host: getBaseUrl(context),
				delivery: context.mediaDelivery,
				defaultLocale: context.config.localization.defaultLocale,
				locales: context.config.localization.locales,
			},
		}),
	};
};

export default getEligibleReviewers;
