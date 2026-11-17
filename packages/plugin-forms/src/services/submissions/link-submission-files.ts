import type { ServiceFn } from "@lucidcms/core/types";
import { SUBMISSION_FILES_TABLE } from "../../constants.js";
import type { SubmissionFilesTables } from "./tables.js";

/**
 * Records submission media separately so downloads and deletion cannot be redirected by edits to
 * the submission document.
 */
const linkSubmissionFiles: ServiceFn<
	[{ submissionId: number; mediaIds: number[] }],
	undefined
> = async (context, data) => {
	if (data.mediaIds.length === 0) return { error: undefined, data: undefined };

	const query = context.db.kysely
		.$extendTables<SubmissionFilesTables>()
		.insertInto(SUBMISSION_FILES_TABLE)
		.values(
			data.mediaIds.map((mediaId) => ({
				submission_id: data.submissionId,
				media_id: mediaId,
			})),
		);
	const linked = await context.db
		.query("forms.submission-files.insert", () => query)
		.many();
	if (linked.error) return linked;

	return { error: undefined, data: undefined };
};

export default linkSubmissionFiles;
