import { copy } from "../../libs/i18n/index.js";
import {
	RequestEventsRepository,
	RequestsRepository,
} from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import sendNotification from "../notifications/send.js";
import getRequestAccess from "./helpers/get-request-access.js";
import getRequestParticipants from "./helpers/get-request-participants.js";
import loadRequest from "./helpers/load-request.js";
import lockRequest from "./helpers/lock-request.js";
import resolveRequestNotifications from "./helpers/resolve-request-notifications.js";
import { closedNotification } from "./notifications/closed.js";

/** Closes a request without publishing it. It can be reopened later. */
const close: ServiceFn<[{ id: number; user: LucidUser }], undefined> = async (
	context,
	data,
) => {
	const Requests = new RequestsRepository(context.db);
	const RequestEvents = new RequestEventsRepository(context.db);

	const lockRes = await lockRequest(context, { id: data.id });
	if (lockRes.error) return lockRes;
	await using _lock = lockRes.data;

	const requestRes = await loadRequest(context, data);
	if (requestRes.error) return requestRes;

	if (
		!getRequestAccess(context, {
			request: requestRes.data,
			user: data.user,
		}).edit
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	const updateRes = await Requests.updateSingle({
		data: {
			status: "closed",
			execution_job_id: null,
			updated_at: new Date().toISOString(),
		},
		where: [{ key: "id", operator: "=", value: data.id }],
	});
	if (updateRes.error) return updateRes;

	const eventsRes = await RequestEvents.createEvents({
		data: [{ request_id: data.id, user_id: data.user.id, type: "closed" }],
	});
	if (eventsRes.error) return eventsRes;

	const request = requestRes.data;
	const resolveRes = await resolveRequestNotifications(context, { request });
	if (resolveRes.error) return resolveRes;

	const closedRes = await sendNotification(context, {
		definition: closedNotification,
		recipients: getRequestParticipants(request),
		actorUserId: data.user.id,
		data: { requestId: data.id, title: request.title, reopened: false },
	});
	if (closedRes.error) return closedRes;

	return { error: undefined, data: undefined };
};

export default close;
