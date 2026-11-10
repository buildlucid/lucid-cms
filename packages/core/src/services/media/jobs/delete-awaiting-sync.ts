import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import { LucidError } from "../../../utils/errors/index.js";
import deletePendingUpload from "../helpers/delete-pending-upload.js";

const input = z.object({ key: z.string().min(1) });

/**
 * Deletes expired media that is still awaiting sync
 */
export const deleteAwaitingSyncMediaJob = defineJob({
	key: "core:delete-unsynced-media",
	version: 1,
	input,
	handler: async ({ context, input }) => {
		const result = await deletePendingUpload(context, input);
		if (result.error) throw new LucidError(result.error);
	},
	describe: ({ input: { key } }) => ({ key }),
});
