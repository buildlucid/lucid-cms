import type { RequestCommentResolution } from "../../libs/db/tables/index.js";
import { copy } from "../../libs/i18n/index.js";
import { RequestEventsRepository } from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getRequestAccess from "./helpers/get-request-access.js";
import loadRequest from "./helpers/load-request.js";
import lockRequest from "./helpers/lock-request.js";

/**
 * Resolves or closes a comment on an open request, or reopens it with null.
 * The comment's author and anyone who can edit or approve the request can.
 * Replies are resolved with their thread.
 */
const updateCommentResolution: ServiceFn<
	[
		{
			id: number;
			eventId: number;
			user: LucidUser;
			resolution: RequestCommentResolution | null;
		},
	],
	undefined
> = async (context, data) => {
	const RequestEvents = new RequestEventsRepository(context.db);

	//* open comments stop approval, so changes wait for any approval in progress
	const lockRes = await lockRequest(context, { id: data.id });
	if (lockRes.error) return lockRes;
	await using _lock = lockRes.data;

	const requestRes = await loadRequest(context, data);
	if (requestRes.error) return requestRes;

	const request = requestRes.data;
	const comment = request.events.find(
		(event) =>
			event.id === data.eventId &&
			event.type === "comment" &&
			event.parent_id === null,
	);
	if (!comment) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.comment.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	const access = getRequestAccess(context, { request, user: data.user });
	if (
		request.status !== "open" ||
		(comment.user_id !== data.user.id && !access.edit && !access.approve)
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

	const updateRes = await RequestEvents.updateSingle({
		data: {
			resolution: data.resolution,
			resolved_by: data.resolution ? data.user.id : null,
			resolved_at: data.resolution ? new Date().toISOString() : null,
		},
		where: [{ key: "id", operator: "=", value: comment.id }],
	});
	if (updateRes.error) return updateRes;

	return { error: undefined, data: undefined };
};

export default updateCommentResolution;
