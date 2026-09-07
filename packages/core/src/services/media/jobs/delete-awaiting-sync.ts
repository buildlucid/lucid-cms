import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import deletePendingUpload from "../helpers/delete-pending-upload.js";

const input = z.object({ key: z.string().min(1) });

const deleteAwaitingSyncMedia: JobHandler<z.infer<typeof input>> =
	deletePendingUpload;

/**
 * Deletes expired media that is still awaiting sync
 */
export const deleteAwaitingSyncMediaJob = defineJob({
	name: "core:delete-unsynced-media",
	version: 1,
	input,
	handler: deleteAwaitingSyncMedia,
	describe: ({ key }) => ({ key }),
});
