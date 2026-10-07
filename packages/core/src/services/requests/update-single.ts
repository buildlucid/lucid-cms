import type { RichTextJSON } from "@lucidcms/rich-text";
import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import {
	RequestEventsRepository,
	RequestsRepository,
} from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getRequestAccess from "./helpers/get-request-access.js";
import loadRequest from "./helpers/load-request.js";
import lockRequest from "./helpers/lock-request.js";
import notifyMentions from "./helpers/notify-mentions.js";
import parseSchedule from "./helpers/parse-schedule.js";
import resolveMentions from "./helpers/resolve-mentions.js";
import scheduleRequest from "./helpers/schedule-request.js";
import setReviewers from "./helpers/set-reviewers.js";

/**
 * Updates the title, description, reviewers or schedule. None of these change the content or targets,
 * so an approval is kept.
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
	const Requests = new RequestsRepository(context.db);
	const RequestEvents = new RequestEventsRepository(context.db);

	const lockRes = await lockRequest(context, { id: data.id });
	if (lockRes.error) return lockRes;
	await using _lock = lockRes.data;

	const requestRes = await loadRequest(context, data);
	if (requestRes.error) return requestRes;

	const request = requestRes.data;
	const access = getRequestAccess(context, { request, user: data.user });
	const editing =
		data.title !== undefined ||
		data.description !== undefined ||
		data.reviewerIds !== undefined;
	const scheduling = data.scheduledAt !== undefined;
	if ((editing && !access.edit) || (scheduling && !access.request)) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	const descriptionRes = data.description
		? await resolveMentions(context, { request, body: data.description })
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
			formatter.formatDate(request.scheduled_at) ||
			scheduleRes.data.timezone !== request.scheduled_timezone)
			? scheduleRes.data
			: undefined;

	const updateRes = await Requests.updateSingle({
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
		where: [{ key: "id", operator: "=", value: request.id }],
	});
	if (updateRes.error) return updateRes;

	if (schedule) {
		const eventsRes = await RequestEvents.createEvents({
			data: [
				{
					request_id: request.id,
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

		const queueRes = await scheduleRequest(context, {
			id: request.id,
			skipRequestWriteClaim: true,
		});
		if (queueRes.error) return queueRes;
	}

	if (data.reviewerIds !== undefined) {
		const reviewersRes = await setReviewers(context, {
			request,
			reviewerIds: data.reviewerIds,
			userId: data.user.id,
		});
		if (reviewersRes.error) return reviewersRes;
	}

	if (descriptionRes?.data) {
		const mentionsRes = await notifyMentions(context, {
			request: { id: request.id, title: data.title ?? request.title },
			body: descriptionRes.data,
			previous: request.description,
			actorUserId: data.user.id,
		});
		if (mentionsRes.error) return mentionsRes;
	}

	return { error: undefined, data: undefined };
};

export default updateSingle;
