import type { ReleaseType } from "../../libs/db/tables/releases.js";
import formatter from "../../libs/formatters/index.js";
import { ReleasesRepository } from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type {
	ReleaseOverview,
	ReleaseOverviewCounts,
} from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getListAccess from "./helpers/get-list-access.js";

/** Counts the open releases a user can see for each type, for dashboards and filter presets. */
const getOverview: ServiceFn<[{ user: LucidUser }], ReleaseOverview> = async (
	context,
	data,
) => {
	const Releases = new ReleasesRepository(context.db);

	const overviewRes = await Releases.selectOverview({
		access: getListAccess(context, data.user),
	});
	if (overviewRes.error) return overviewRes;

	const counts = (type: ReleaseType): ReleaseOverviewCounts => {
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
		data: { publish: counts("publish"), create: counts("create") },
	};
};

export default getOverview;
