import { parseSourceHTML } from "@lucidcms/rich-text/server";
import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import createComment from "../../create-comment.js";
import getRequestLink from "../../helpers/get-request-link.js";
import linkRequest from "../helpers/link-request.js";
import loadToolRequest from "../helpers/load-tool-request.js";
import type { RequestWriteToolProps } from "../types.js";
import type { outputSchema } from "./schema.js";

/** Comments on a request, or replies to one of its comments, as the run's actor. */
const commentOnRequest: ServiceFn<
	[
		RequestWriteToolProps & {
			requestId: number;
			body: string;
			replyTo?: number;
		},
	],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const requestRes = await loadToolRequest(context, {
		...props,
		id: props.requestId,
	});
	if (requestRes.error) return requestRes;

	if (
		props.replyTo !== undefined &&
		!requestRes.data.request.events.some(
			(event) =>
				event.id === props.replyTo &&
				event.type === "comment" &&
				event.parent_id === null,
		)
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.tools.requests.reply.not.found", {
					data: { requestId: props.requestId, commentId: props.replyTo },
				}),
				status: 404,
			},
			data: undefined,
		};
	}

	const commentRes = await createComment(context, {
		id: props.requestId,
		user: requestRes.data.user,
		agentRunId: props.actor.agentRunId,
		body: parseSourceHTML(props.body),
		parentId: props.replyTo,
	});
	if (commentRes.error) return commentRes;

	const linkRes = await linkRequest(context, props);
	if (linkRes.error) return linkRes;

	return {
		error: undefined,
		data: {
			output: {
				comment: { id: commentRes.data.id },
				links: { request: getRequestLink(context, props.requestId) },
			},
		},
	};
};

export default commentOnRequest;
