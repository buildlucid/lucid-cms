import { copy } from "../../libs/i18n/index.js";
import {
	ReleaseEventsRepository,
	ReleasesRepository,
} from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getReleaseAccess from "./helpers/get-release-access.js";
import loadRelease from "./helpers/load-release.js";
import lockRelease from "./helpers/lock-release.js";

/** Closes a release without publishing it. It can be reopened later. */
const close: ServiceFn<[{ id: number; user: LucidUser }], undefined> = async (
	context,
	data,
) => {
	const Releases = new ReleasesRepository(context.db);
	const ReleaseEvents = new ReleaseEventsRepository(context.db);

	const lockRes = await lockRelease(context, { id: data.id });
	if (lockRes.error) return lockRes;
	await using _lock = lockRes.data;

	const releaseRes = await loadRelease(context, data);
	if (releaseRes.error) return releaseRes;

	if (
		!getReleaseAccess(context, {
			release: releaseRes.data,
			user: data.user,
		}).edit
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	const updateRes = await Releases.updateSingle({
		data: {
			status: "closed",
			execution_job_id: null,
			updated_at: new Date().toISOString(),
		},
		where: [{ key: "id", operator: "=", value: data.id }],
	});
	if (updateRes.error) return updateRes;

	const eventsRes = await ReleaseEvents.createEvents({
		data: [{ release_id: data.id, user_id: data.user.id, type: "closed" }],
	});
	if (eventsRes.error) return eventsRes;

	return { error: undefined, data: undefined };
};

export default close;
