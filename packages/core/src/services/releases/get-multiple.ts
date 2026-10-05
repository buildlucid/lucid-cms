import formatter, { releasesFormatter } from "../../libs/formatters/index.js";
import { ReleasesRepository } from "../../libs/repositories/index.js";
import type { GetMultipleQueryParams } from "../../schemas/releases.js";
import type { LucidUser } from "../../types/hono.js";
import type { ReleaseSummary } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getListAccess from "./helpers/get-list-access.js";
import getReleaseAccess from "./helpers/get-release-access.js";
import getReleaseUsers from "./helpers/get-release-users.js";

const getMultiple: ServiceFn<
	[{ user: LucidUser; query: GetMultipleQueryParams }],
	{ data: ReleaseSummary[]; count: number }
> = async (context, data) => {
	const Releases = new ReleasesRepository(context.db);

	const releasesRes = await Releases.selectMultipleSummaries({
		access: getListAccess(context, data.user),
		queryParams: data.query,
		validation: { enabled: true },
	});
	if (releasesRes.error) return releasesRes;

	const [releases, count] = releasesRes.data;
	const usersRes = await getReleaseUsers(context, {
		ids: releases.flatMap((release) => [
			release.created_by,
			...release.reviewers.map((reviewer) => reviewer.user_id),
		]),
	});
	if (usersRes.error) return usersRes;

	return {
		error: undefined,
		data: {
			data: releases.map((release) =>
				releasesFormatter.formatSummary({
					release,
					users: usersRes.data,
					permissions: getReleaseAccess(context, { release, user: data.user }),
				}),
			),
			count: formatter.parseCount(count?.count),
		},
	};
};

export default getMultiple;
