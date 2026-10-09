import {
	extractRichTextReferences,
	type RichTextJSON,
} from "@lucidcms/rich-text";
import type { ServiceFn } from "../../../utils/services/types.js";
import sendNotification from "../../notifications/send.js";
import { mentionedNotification } from "../notifications/mentioned.js";
import commentExcerpt from "./comment-excerpt.js";

const mentionedUserIds = (body: RichTextJSON) =>
	extractRichTextReferences(body).flatMap((reference) =>
		reference.type === "rich-text-mention" &&
		typeof reference.userId === "number"
			? [reference.userId]
			: [],
	);

/**
 * Tells everyone mentioned in a comment or description. Pass the previous
 * description so only new mentions are told. Returns who was told, which is
 * empty when the type is turned off.
 */
const notifyMentions: ServiceFn<
	[
		{
			request: { id: number; title: string };
			body: RichTextJSON;
			previous?: RichTextJSON | null;
			actorUserId: number | null;
		},
	],
	number[]
> = async (context, data) => {
	const previous = new Set(
		data.previous ? mentionedUserIds(data.previous) : [],
	);
	const userIds = [
		...new Set(
			mentionedUserIds(data.body).filter((userId) => !previous.has(userId)),
		),
	];
	if (userIds.length === 0) return { error: undefined, data: [] };

	const sendRes = await sendNotification(context, {
		definition: mentionedNotification,
		recipients: userIds,
		actorUserId: data.actorUserId,
		data: {
			requestId: data.request.id,
			title: data.request.title,
			excerpt: commentExcerpt(data.body),
		},
	});
	if (sendRes.error) return sendRes;
	if (sendRes.data.id === null) return { error: undefined, data: [] };

	return { error: undefined, data: userIds };
};

export default notifyMentions;
