import type { RichTextJSON } from "@lucidcms/rich-text";
import formatter from "../../libs/formatters/index.js";
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
import parseSchedule from "./helpers/parse-schedule.js";
import resolveMentions from "./helpers/resolve-mentions.js";
import scheduleRelease from "./helpers/schedule-release.js";
import setReviewers from "./helpers/set-reviewers.js";

/**
 * Updates the title, description, reviewers or schedule. None of these change what is
 * released, so an approval is kept.
 */
const updateSingle: ServiceFn<
	[
		{
			id: number;
			user: LucidUser;
			title?: string;
			description?: RichTextJSON | null;
			reviewerIds?: number[];
			scheduledAt?: string | null;
			scheduledTimezone?: string | null;
		},
	],
	undefined
> = async (context, data) => {
	const Releases = new ReleasesRepository(context.db);
	const ReleaseEvents = new ReleaseEventsRepository(context.db);

	const lockRes = await lockRelease(context, { id: data.id });
	if (lockRes.error) return lockRes;
	await using _lock = lockRes.data;

	const releaseRes = await loadRelease(context, data);
	if (releaseRes.error) return releaseRes;

	const release = releaseRes.data;
	const access = getReleaseAccess(context, { release, user: data.user });
	const editing =
		data.title !== undefined ||
		data.description !== undefined ||
		data.reviewerIds !== undefined;
	const scheduling = data.scheduledAt !== undefined;
	if ((editing && !access.edit) || (scheduling && !access.release)) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	const descriptionRes = data.description
		? await resolveMentions(context, { release, body: data.description })
		: undefined;
	if (descriptionRes?.error) return descriptionRes;

	const scheduleRes =
		data.scheduledAt !== undefined
			? parseSchedule({
					scheduledAt: data.scheduledAt,
					scheduledTimezone: data.scheduledTimezone,
				})
			: undefined;
	if (scheduleRes?.error) return scheduleRes;

	//* only a changed schedule is saved, re-queued and recorded
	const schedule =
		scheduleRes?.data &&
		(scheduleRes.data.scheduledAt !==
			formatter.formatDate(release.scheduled_at) ||
			scheduleRes.data.timezone !== release.scheduled_timezone)
			? scheduleRes.data
			: undefined;

	const updateRes = await Releases.updateSingle({
		data: {
			title: data.title,
			description: descriptionRes ? descriptionRes.data : data.description,
			...(schedule
				? {
						scheduled_at: schedule.scheduledAt,
						scheduled_timezone: schedule.timezone,
						scheduled_by: schedule.scheduledAt ? data.user.id : null,
						execution_job_id: null,
						failure: null,
					}
				: {}),
			updated_at: new Date().toISOString(),
		},
		where: [{ key: "id", operator: "=", value: release.id }],
	});
	if (updateRes.error) return updateRes;

	if (schedule) {
		const eventsRes = await ReleaseEvents.createEvents({
			data: [
				{
					release_id: release.id,
					user_id: data.user.id,
					type: "schedule_updated",
					metadata: {
						scheduledAt: schedule.scheduledAt,
						scheduledTimezone: schedule.timezone,
					},
				},
			],
		});
		if (eventsRes.error) return eventsRes;

		const queueRes = await scheduleRelease(context, {
			id: release.id,
			skipReleaseWriteClaim: true,
		});
		if (queueRes.error) return queueRes;
	}

	if (data.reviewerIds !== undefined) {
		const reviewersRes = await setReviewers(context, {
			release,
			reviewerIds: data.reviewerIds,
			userId: data.user.id,
		});
		if (reviewersRes.error) return reviewersRes;
	}

	return { error: undefined, data: undefined };
};

export default updateSingle;
