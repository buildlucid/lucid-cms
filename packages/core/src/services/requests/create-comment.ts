import type { RichTextJSON } from "@lucidcms/rich-text";
import { generateText } from "@lucidcms/rich-text/server";
import { copy } from "../../libs/i18n/index.js";
import { RequestEventsRepository } from "../../libs/repositories/index.js";
import type { LucidActor } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import sendNotification from "../notifications/send.js";
import commentExcerpt from "./helpers/comment-excerpt.js";
import dismissApproval from "./helpers/dismiss-approval.js";
import getRequestParticipants from "./helpers/get-request-participants.js";
import loadRequest from "./helpers/load-request.js";
import lockRequest from "./helpers/lock-request.js";
import notifyMentions from "./helpers/notify-mentions.js";
import resolveMentions from "./helpers/resolve-mentions.js";
import { commentedNotification } from "./notifications/commented.js";

/** Adds a comment or reply for a request reader, withdrawing approvals only for top-level comments. */
const createComment: ServiceFn<
	[
		{
			id: number;
			user: LucidActor;
			agentRunId?: string;
			body: RichTextJSON;
			parentId?: number;
		},
	],
	{ id: number }
> = async (context, data) => {
	const RequestEvents = new RequestEventsRepository(context.db);

	if (!generateText(data.body).trim()) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.comment.empty"),
				status: 400,
			},
			data: undefined,
		};
	}

	const lockRes = await lockRequest(context, { id: data.id });
	if (lockRes.error) return lockRes;
	await using _lock = lockRes.data;

	const requestRes = await loadRequest(context, data);
	if (requestRes.error) return requestRes;

	const request = requestRes.data;

	//* replies go one level deep, so only top-level comments take them
	if (
		data.parentId !== undefined &&
		!request.events.some(
			(event) =>
				event.id === data.parentId &&
				event.type === "comment" &&
				event.parent_id === null,
		)
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.comment.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	const bodyRes = await resolveMentions(context, { request, body: data.body });
	if (bodyRes.error) return bodyRes;

	const commentRes = await RequestEvents.createSingle({
		data: {
			request_id: request.id,
			user_id: data.user.id,
			agent_run_id: data.agentRunId ?? null,
			parent_id: data.parentId ?? null,
			type: "comment",
			body: bodyRes.data,
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	if (commentRes.error) return commentRes;

	if (data.parentId === undefined && request.approvals.length > 0) {
		const dismissRes = await dismissApproval(context, {
			ids: [request.id],
			userId: data.user.id,
		});
		if (dismissRes.error) return dismissRes;
	}

	const mentionsRes = await notifyMentions(context, {
		request,
		body: bodyRes.data,
		actorUserId: data.user.id,
		actorRunId: data.agentRunId,
	});
	if (mentionsRes.error) return mentionsRes;

	//* people in the thread hear about replies; mentioned people are already told
	const thread =
		data.parentId === undefined
			? []
			: request.events.flatMap((event) =>
					(event.id === data.parentId || event.parent_id === data.parentId) &&
					event.user_id !== null
						? [event.user_id]
						: [],
				);
	const notifyRes = await sendNotification(context, {
		definition: commentedNotification,
		recipients: [...getRequestParticipants(request), ...thread].filter(
			(userId) => !mentionsRes.data.includes(userId),
		),
		actorUserId: data.user.id,
		actorRunId: data.agentRunId,
		data: {
			requestId: request.id,
			title: request.title,
			excerpt: commentExcerpt(bodyRes.data),
		},
	});
	if (notifyRes.error) return notifyRes;

	return { error: undefined, data: { id: commentRes.data.id } };
};

export default createComment;
