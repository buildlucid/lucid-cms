import { copy } from "../../libs/i18n/index.js";
import { RequestEventsRepository } from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import loadRequest from "./helpers/load-request.js";

/**
 * People can delete their own comments and replies, and super admins can
 * delete anyone's. Deleting a comment removes its replies too.
 */
const deleteComment: ServiceFn<
	[{ id: number; eventId: number; user: LucidUser }],
	undefined
> = async (context, data) => {
	const RequestEvents = new RequestEventsRepository(context.db);

	const requestRes = await loadRequest(context, data);
	if (requestRes.error) return requestRes;

	const comment = requestRes.data.events.find(
		(event) => event.id === data.eventId && event.type === "comment",
	);
	if (!comment || (comment.user_id !== data.user.id && !data.user.superAdmin)) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.comment.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	const deleteRes = await RequestEvents.deleteSingle({
		where: [{ key: "id", operator: "=", value: comment.id }],
	});
	if (deleteRes.error) return deleteRes;

	return { error: undefined, data: undefined };
};

export default deleteComment;
