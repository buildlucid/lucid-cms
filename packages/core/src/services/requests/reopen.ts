import { copy } from "../../libs/i18n/index.js";
import {
	RequestEventsRepository,
	RequestsRepository,
} from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import dismissApproval from "./helpers/dismiss-approval.js";
import getRequestAccess from "./helpers/get-request-access.js";
import loadRequest from "./helpers/load-request.js";
import lockRequest from "./helpers/lock-request.js";

/**
 * Reopens a closed request. Content may have changed while it was closed, so
 * any earlier approval is dismissed.
 */
const reopen: ServiceFn<[{ id: number; user: LucidUser }], undefined> = async (
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
		}).reopen
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
		data: { status: "open", updated_at: new Date().toISOString() },
		where: [{ key: "id", operator: "=", value: data.id }],
	});
	if (updateRes.error) return updateRes;

	const eventsRes = await RequestEvents.createEvents({
		data: [{ request_id: data.id, user_id: data.user.id, type: "reopened" }],
	});
	if (eventsRes.error) return eventsRes;

	const dismissRes = await dismissApproval(context, {
		ids: [data.id],
		userId: data.user.id,
	});
	if (dismissRes.error) return dismissRes;

	return { error: undefined, data: undefined };
};

export default reopen;
