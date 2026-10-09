import { parseSourceHTML } from "@lucidcms/rich-text/server";
import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import deleteComment from "../../delete-comment.js";
import getRequestLink from "../../helpers/get-request-link.js";
import isCommentAuthor from "../../helpers/is-comment-author.js";
import updateComment from "../../update-comment.js";
import updateCommentResolution from "../../update-comment-resolution.js";
import linkRequest from "../helpers/link-request.js";
import loadToolRequest from "../helpers/load-tool-request.js";
import type { RequestWriteToolProps } from "../types.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Resolves, closes, reopens, rewrites or removes a comment this agent wrote for the same person, in any of its chats. */
const updateRequestComment: ServiceFn<
	[RequestWriteToolProps & { input: z.output<typeof inputSchema> }],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const { input } = props;
	const requestRes = await loadToolRequest(context, {
		...props,
		id: input.requestId,
	});
	if (requestRes.error) return requestRes;

	const { user, request } = requestRes.data;
	const comment = request.events.find(
		(event) => event.id === input.commentId && event.type === "comment",
	);
	if (!comment) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.tools.requests.comment.not.found", {
					data: { requestId: request.id, commentId: input.commentId },
				}),
				status: 404,
			},
			data: undefined,
		};
	}
	const authorRes = await isCommentAuthor(context, {
		comment,
		user,
		agentRunId: props.actor.agentRunId,
	});
	if (authorRes.error) return authorRes;
	if (!authorRes.data) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.tools.requests.comment.not.yours", {
					data: { commentId: comment.id },
				}),
				status: 403,
			},
			data: undefined,
		};
	}

	const target = {
		id: request.id,
		eventId: comment.id,
		user,
		agentRunId: props.actor.agentRunId,
	};
	const actionRes =
		input.action === "remove"
			? await deleteComment(context, target)
			: input.action === "edit"
				? await updateComment(context, {
						...target,
						body: parseSourceHTML(input.body ?? ""),
					})
				: await updateCommentResolution(context, {
						...target,
						resolution: {
							resolve: "resolved" as const,
							close: "closed" as const,
							reopen: null,
						}[input.action],
					});
	if (actionRes.error) return actionRes;

	const linkRes = await linkRequest(context, {
		...props,
		requestId: request.id,
	});
	if (linkRes.error) return linkRes;

	return {
		error: undefined,
		data: {
			output: {
				links: { request: getRequestLink(context, request.id) },
			},
		},
	};
};

export default updateRequestComment;
