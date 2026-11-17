import { LucidError } from "@lucidcms/core";
import type { LucidHookDocuments } from "@lucidcms/core/types";
import {
	SUBMISSION_FILES_TABLE,
	SUBMISSIONS_COLLECTION_KEY,
} from "../../constants.js";
import getSubmissionMediaIds from "../submissions/get-submission-media-ids.js";
import type { SubmissionFilesTables } from "../submissions/tables.js";

/**
 * Deletes a submission's uploaded files when the submission is deleted for good. They are system
 * media nothing else owns, so they would otherwise be left in storage. Binned submissions keep
 * their files, as they can be restored. Goes by the files the form linked, never the document's
 * own list of them.
 */
const submissionBeforeDeleteHandler: LucidHookDocuments<"beforeDelete">["handler"] =
	async ({ context, toolkit, data, meta }) => {
		if (meta.collectionKey !== SUBMISSIONS_COLLECTION_KEY || !meta.hardDelete) {
			return;
		}

		const mediaIds = await getSubmissionMediaIds(context, {
			submissionIds: data.ids,
		});
		if (mediaIds.error) throw new LucidError(mediaIds.error);
		if (mediaIds.data.length === 0) return;

		for (const id of mediaIds.data) {
			const removed = await toolkit.media.deleteSingle({ id, hard: true });
			//* a file someone already removed leaves nothing to delete
			if (removed.error && removed.error.status !== 404) {
				throw new LucidError(removed.error);
			}
		}

		//* deleting the media removes its rows too, so this only clears those of media that was already gone
		const query = context.db.kysely
			.$extendTables<SubmissionFilesTables>()
			.deleteFrom(SUBMISSION_FILES_TABLE)
			.where("submission_id", "in", data.ids);
		const cleared = await context.db
			.query("forms.submission-files.delete", () => query)
			.many();
		if (cleared.error) throw new LucidError(cleared.error);
	};

export default submissionBeforeDeleteHandler;
