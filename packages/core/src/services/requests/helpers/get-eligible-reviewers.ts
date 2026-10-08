import { documentWorkflowsFormatter } from "../../../libs/formatters/index.js";
import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { RequestUser } from "../../../types/response.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { RequestDocumentRecord, RequestRecord } from "../types.js";
import allowsSelfApproval from "./allows-self-approval.js";
import requestTypePermissions from "./request-type-permissions.js";

const getEligibleReviewers: ServiceFn<
	[
		{
			request: Pick<RequestRecord, "type" | "created_by"> & {
				documents: Array<Pick<RequestDocumentRecord, "collection_key">>;
			};
		},
	],
	RequestUser[]
> = async (context, data) => {
	const Users = new UsersRepository(context.db);

	const collectionKeys = [
		...new Set(
			data.request.documents.map((document) => document.collection_key),
		),
	];
	const permissions = [
		Permissions.RequestsRead,
		...collectionKeys.flatMap((key) => [
			getCollectionPermission(key, "read"),
			//* matches the approve access in getRequestAccess
			getCollectionPermission(
				key,
				requestTypePermissions[data.request.type].approve,
			),
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
				(user) => selfApproval || user.id !== data.request.created_by,
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
