import { createToolkit } from "@lucidcms/core/toolkit";
import type { ServiceFn } from "@lucidcms/core/types";
import { SUBMISSIONS_COLLECTION_KEY } from "../../constants.js";
import findExpiredSubmissionIds, {
	type SubmissionFormMatch,
} from "./find-expired-submission-ids.js";

/** How many submissions a pass deleted, and how many it couldn't. */
export type DeletedSubmissions = { deleted: number; failed: number };

/**
 * Permanently deletes the matching forms' submissions that were sent before `before`, a page at
 * a time. Moves on past submissions that can't be deleted, so a few never hold up the rest, and
 * counts them for the caller to report.
 */
const deleteOlderSubmissions: ServiceFn<
	[{ form: SubmissionFormMatch; before: number }],
	DeletedSubmissions
> = async (context, data) => {
	const toolkit = createToolkit(context);
	const counts: DeletedSubmissions = { deleted: 0, failed: 0 };
	let afterId: number | null = 0;

	while (afterId !== null) {
		const page = await findExpiredSubmissionIds(context, { ...data, afterId });
		if (page.error) return page;

		if (page.data.ids.length > 0) {
			const removed = await toolkit.documents.deleteMultiple({
				collectionKey: SUBMISSIONS_COLLECTION_KEY,
				actor: { type: "system" },
				ids: page.data.ids,
				hard: true,
			});
			if (removed.error) return removed;

			for (const result of removed.data) {
				counts[result.status === "deleted" ? "deleted" : "failed"]++;
			}
		}
		afterId = page.data.next;
	}

	return { error: undefined, data: counts };
};

export default deleteOlderSubmissions;
