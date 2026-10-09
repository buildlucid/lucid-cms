import { copy } from "../../libs/i18n/index.js";
import { RequestEventsRepository } from "../../libs/repositories/index.js";
import type { LucidActor } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import isCommentAuthor from "./helpers/is-comment-author.js";
import loadRequest from "./helpers/load-request.js";

/** Deletes the actor's comment and replies, allowing super admins and the system to moderate only without an agent. */
const deleteComment: ServiceFn<
	[{ id: number; eventId: number; user: LucidActor; agentRunId?: string }],
	undefined
> = async (context, data) => {
	const RequestEvents = new RequestEventsRepository(context.db);

	const requestRes = await loadRequest(context, data);
	if (requestRes.error) return requestRes;

	const comment = requestRes.data.events.find(
		(event) => event.id === data.eventId && event.type === "comment",
	);
	const authorRes = comment
		? await isCommentAuthor(context, { ...data, comment })
		: undefined;
	if (authorRes?.error) return authorRes;
	//* agents never moderate, even for a super admin
	const moderator = data.user.superAdmin && data.agentRunId === undefined;
	if (!comment || (!authorRes?.data && !moderator)) {
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
