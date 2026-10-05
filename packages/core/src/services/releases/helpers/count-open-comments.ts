import type { ReleaseRecord } from "../types.js";

/**
 * Counts comments still waiting to be resolved or closed. People never need
 * to resolve their own comments, so those don't count for them.
 */
const countOpenComments = (data: {
	events: Pick<
		ReleaseRecord["events"][number],
		"type" | "user_id" | "resolution"
	>[];
	userId: number;
}) =>
	data.events.filter(
		(event) =>
			event.type === "comment" &&
			event.resolution === null &&
			event.user_id !== data.userId,
	).length;

export default countOpenComments;
