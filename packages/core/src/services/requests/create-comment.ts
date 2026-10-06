import type { RichTextJSON } from "@lucidcms/rich-text";
import { generateText } from "@lucidcms/rich-text/server";
import { copy } from "../../libs/i18n/index.js";
import { RequestEventsRepository } from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import dismissApproval from "./helpers/dismiss-approval.js";
import loadRequest from "./helpers/load-request.js";
import lockRequest from "./helpers/lock-request.js";
import resolveMentions from "./helpers/resolve-mentions.js";

/**
 * Anyone who can read a request can comment on it, whatever its status. A
 * comment withdraws an approval, so the request is approved again once it
 * has been dealt with. Replies join a comment's thread and leave the request
 * as it is.
 */
const createComment: ServiceFn<
	[{ id: number; user: LucidUser; body: RichTextJSON; parentId?: number }],
	undefined
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

	const eventsRes = await RequestEvents.createEvents({
		data: [
			{
				request_id: request.id,
				user_id: data.user.id,
				parent_id: data.parentId ?? null,
				type: "comment",
				body: bodyRes.data,
			},
		],
	});
	if (eventsRes.error) return eventsRes;

	if (
		data.parentId === undefined &&
		request.approved_revision === request.revision
	) {
		const dismissRes = await dismissApproval(context, {
			ids: [request.id],
			userId: data.user.id,
		});
		if (dismissRes.error) return dismissRes;
	}

	return { error: undefined, data: undefined };
};

export default createComment;
