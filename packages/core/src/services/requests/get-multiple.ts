import formatter, { requestsFormatter } from "../../libs/formatters/index.js";
import { RequestsRepository } from "../../libs/repositories/index.js";
import type { GetMultipleQueryParams } from "../../schemas/requests.js";
import type { LucidUser } from "../../types/hono.js";
import type { RequestSummary } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getListAccess from "./helpers/get-list-access.js";
import getRequestAccess from "./helpers/get-request-access.js";
import getRequestUsers from "./helpers/get-request-users.js";

const getMultiple: ServiceFn<
	[{ user: LucidUser; query: GetMultipleQueryParams }],
	{ data: RequestSummary[]; count: number }
> = async (context, data) => {
	const Requests = new RequestsRepository(context.db);

	const requestsRes = await Requests.selectMultipleSummaries({
		access: getListAccess(context, data.user),
		queryParams: data.query,
		validation: { enabled: true },
	});
	if (requestsRes.error) return requestsRes;

	const [requests, count] = requestsRes.data;
	const usersRes = await getRequestUsers(context, {
		ids: requests.flatMap((request) => [
			request.created_by,
			...request.reviewers.map((reviewer) => reviewer.user_id),
		]),
	});
	if (usersRes.error) return usersRes;

	return {
		error: undefined,
		data: {
			data: requests.map((request) =>
				requestsFormatter.formatSummary({
					request,
					users: usersRes.data,
					permissions: getRequestAccess(context, { request, user: data.user }),
				}),
			),
			count: formatter.parseCount(count?.count),
		},
	};
};

export default getMultiple;
