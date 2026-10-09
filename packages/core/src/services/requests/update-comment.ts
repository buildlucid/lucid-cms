import type { RichTextJSON } from "@lucidcms/rich-text";
import { generateText } from "@lucidcms/rich-text/server";
import { copy } from "../../libs/i18n/index.js";
import { RequestEventsRepository } from "../../libs/repositories/index.js";
import type { LucidActor } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import isCommentAuthor from "./helpers/is-comment-author.js";
import loadRequest from "./helpers/load-request.js";
import resolveMentions from "./helpers/resolve-mentions.js";

/** People can only edit their own comments and replies, and agents only theirs. */
const updateComment: ServiceFn<
	[
		{
			id: number;
			eventId: number;
			user: LucidActor;
			agentRunId?: string;
			body: RichTextJSON;
		},
	],
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

	const requestRes = await loadRequest(context, data);
	if (requestRes.error) return requestRes;

	const comment = requestRes.data.events.find(
		(event) => event.id === data.eventId && event.type === "comment",
	);
	const authorRes = comment
		? await isCommentAuthor(context, { ...data, comment })
		: undefined;
	if (authorRes?.error) return authorRes;
	if (!comment || !authorRes?.data) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.comment.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	const bodyRes = await resolveMentions(context, {
		request: requestRes.data,
		body: data.body,
	});
	if (bodyRes.error) return bodyRes;

	const updateRes = await RequestEvents.updateSingle({
		data: { body: bodyRes.data, updated_at: new Date().toISOString() },
		where: [{ key: "id", operator: "=", value: comment.id }],
	});
	if (updateRes.error) return updateRes;

	return { error: undefined, data: undefined };
};

export default updateComment;
