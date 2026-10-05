import formatter from "../../libs/formatters/index.js";
import { ReleasesRepository } from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ReleaseOverview } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getListAccess from "./helpers/get-list-access.js";

/** Counts the open releases a user can see, for dashboards and filter presets. */
const getOverview: ServiceFn<[{ user: LucidUser }], ReleaseOverview> = async (
	context,
	data,
) => {
	const Releases = new ReleasesRepository(context.db);

	const overviewRes = await Releases.selectOverview({
		access: getListAccess(context, data.user),
	});
	if (overviewRes.error) return overviewRes;

	return {
		error: undefined,
		data: {
			awaitingApproval: formatter.parseCount(
				overviewRes.data?.awaiting_approval,
			),
			approved: formatter.parseCount(overviewRes.data?.approved),
			scheduled: formatter.parseCount(overviewRes.data?.scheduled),
			failed: formatter.parseCount(overviewRes.data?.failed),
			assignedToMe: formatter.parseCount(overviewRes.data?.assigned_to_me),
		},
	};
};

export default getOverview;
