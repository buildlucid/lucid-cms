import { z } from "@lucidcms/core";
import type { ServiceFn } from "@lucidcms/core/types";
import { SUBMISSION_FILES_TABLE } from "../../constants.js";
import type { SubmissionFilesTables } from "./tables.js";

const rowSchema = z.object({ media_id: z.number() });

/** The media a form stored for these submissions, optionally narrowed to one media ID. */
const getSubmissionMediaIds: ServiceFn<
	[{ submissionIds: number[]; mediaId?: number }],
	number[]
> = async (context, data) => {
	if (data.submissionIds.length === 0) return { error: undefined, data: [] };

	let query = context.db.kysely
		.$extendTables<SubmissionFilesTables>()
		.selectFrom(SUBMISSION_FILES_TABLE)
		.select("media_id")
		.where("submission_id", "in", data.submissionIds);
	if (data.mediaId !== undefined) {
		query = query.where("media_id", "=", data.mediaId);
	}
	const rows = await context.db
		.query("forms.submission-files.select", () => query)
		.many({ schema: rowSchema });
	if (rows.error) return rows;

	return { error: undefined, data: rows.data.map((row) => row.media_id) };
};

export default getSubmissionMediaIds;
