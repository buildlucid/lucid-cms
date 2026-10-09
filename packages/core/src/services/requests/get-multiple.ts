import formatter, { requestsFormatter } from "../../libs/formatters/index.js";
import { RequestsRepository } from "../../libs/repositories/index.js";
import type { GetMultipleQueryParams } from "../../schemas/requests.js";
import type { LucidActor } from "../../types/hono.js";
import type { RequestSummary } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getAgentActors from "../agent/helpers/get-agent-actors.js";
import getListAccess from "./helpers/get-list-access.js";
import getRequestAccess from "./helpers/get-request-access.js";
import getRequestUsers from "./helpers/get-request-users.js";

const getMultiple: ServiceFn<
	[
		{
			user: LucidActor;
			query: GetMultipleQueryParams;
			/** Only lists requests whose documents are all in these collections. */
			collectionKeys?: readonly string[];
		},
	],
	{ data: RequestSummary[]; count: number }
> = async (context, data) => {
	const Requests = new RequestsRepository(context.db);

	const requestsRes = await Requests.selectMultipleSummaries({
		access: getListAccess(context, data.user, data.collectionKeys),
		queryParams: data.query,
		validation: { enabled: true },
	});
	if (requestsRes.error) return requestsRes;

	const [requests, count] = requestsRes.data;
	const [usersRes, agentsRes] = await Promise.all([
		getRequestUsers(context, {
			ids: requests.flatMap((request) => [
				request.created_by,
				...request.reviewers.map((reviewer) => reviewer.user_id),
			]),
		}),
		getAgentActors(context, {
			runIds: requests.map((request) => request.created_by_run_id),
		}),
	]);
	if (usersRes.error) return usersRes;
	if (agentsRes.error) return agentsRes;

	return {
		error: undefined,
		data: {
			data: requests.map((request) =>
				requestsFormatter.formatSummary({
					request,
					users: usersRes.data,
					agents: agentsRes.data,
					permissions: getRequestAccess(context, { request, user: data.user }),
				}),
			),
			count: formatter.parseCount(count?.count),
		},
	};
};

export default getMultiple;
