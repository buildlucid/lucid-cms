import type { RequestType } from "../../libs/db/tables/requests.js";
import formatter from "../../libs/formatters/index.js";
import { RequestsRepository } from "../../libs/repositories/index.js";
import type { LucidActor } from "../../types/hono.js";
import type {
	RequestOverview,
	RequestOverviewCounts,
} from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getListAccess from "./helpers/get-list-access.js";

/** Counts the open requests a user can see for each type, for dashboards and filter presets. */
const getOverview: ServiceFn<[{ user: LucidActor }], RequestOverview> = async (
	context,
	data,
) => {
	const Requests = new RequestsRepository(context.db);

	const overviewRes = await Requests.selectOverview({
		access: getListAccess(context, data.user),
	});
	if (overviewRes.error) return overviewRes;

	const counts = (type: RequestType): RequestOverviewCounts => {
		const row = overviewRes.data?.find((row) => row.type === type);
		return {
			awaitingApproval: formatter.parseCount(row?.awaiting_approval),
			approved: formatter.parseCount(row?.approved),
			scheduled: formatter.parseCount(row?.scheduled),
			failed: formatter.parseCount(row?.failed),
			assignedToMe: formatter.parseCount(row?.assigned_to_me),
		};
	};

	return {
		error: undefined,
		data: {
			create: counts("create"),
			publish: counts("publish"),
			unpublish: counts("unpublish"),
			delete: counts("delete"),
		},
	};
};

export default getOverview;
