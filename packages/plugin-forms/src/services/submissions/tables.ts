import type { Generated } from "kysely";

/** A file a form stored for a submission. Removed with its media, or when the submission is deleted for good. */
type SubmissionFileRow = {
	id: Generated<number>;
	/** The submission's document ID. */
	submission_id: number;
	media_id: number;
};

export type SubmissionFilesTables = {
	plugin_forms_submission_files: SubmissionFileRow;
};
