import { releasesFormatter } from "../../libs/formatters/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { Release } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getBlockers from "./helpers/get-blockers.js";
import getReleaseAccess from "./helpers/get-release-access.js";
import getReleaseState from "./helpers/get-release-state.js";
import getReleaseUsers from "./helpers/get-release-users.js";
import loadRelease from "./helpers/load-release.js";

/** Gets a release with its documents, checks, activity and the user's permissions. */
const getSingle: ServiceFn<[{ id: number; user: LucidUser }], Release> = async (
	context,
	data,
) => {
	const releaseRes = await loadRelease(context, data);
	if (releaseRes.error) return releaseRes;

	const release = releaseRes.data;
	const [stateRes, usersRes] = await Promise.all([
		getReleaseState(context, { release, labels: true }),
		getReleaseUsers(context, {
			ids: [
				release.created_by,
				release.approved_by,
				...release.documents.flatMap((document) =>
					document.targets.map((target) => target.reviewed_by),
				),
				...release.reviewers.map((reviewer) => reviewer.user_id),
				...release.events.flatMap((event) => [
					event.user_id,
					event.resolved_by,
					event.metadata?.userId ?? null,
				]),
			],
		}),
	]);
	if (stateRes.error) return stateRes;
	if (usersRes.error) return usersRes;

	const { read: _read, ...permissions } = getReleaseAccess(context, {
		release,
		user: data.user,
	});

	return {
		error: undefined,
		data: releasesFormatter.formatSingle({
			release,
			state: stateRes.data,
			blockers: getBlockers(context, { release, state: stateRes.data }),
			permissions,
			user: data.user,
			users: usersRes.data,
		}),
	};
};

export default getSingle;
