import type { RequestRecord } from "../types.js";

/**
 * Counts comments still waiting to be resolved or closed, whoever wrote them.
 * Replies are resolved with their thread, so they don't count.
 */
const countOpenComments = (data: {
	events: Pick<
		RequestRecord["events"][number],
		"type" | "parent_id" | "resolution"
	>[];
}) =>
	data.events.filter(
		(event) =>
			event.type === "comment" &&
			event.parent_id === null &&
			event.resolution === null,
	).length;

export default countOpenComments;
