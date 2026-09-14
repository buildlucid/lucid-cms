import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import deletePendingUpload from "../helpers/delete-pending-upload.js";

const input = z.object({ key: z.string().min(1) });

/**
 * Deletes expired media that is still awaiting sync
 */
export const deleteAwaitingSyncMediaJob = defineJob({
	name: "core:delete-unsynced-media",
	version: 1,
	input,
	handler: ({ context, input }) => deletePendingUpload(context, input),
	describe: ({ input: { key } }) => ({ key }),
});
