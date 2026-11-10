import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobService } from "../../../libs/jobs/types.js";
import { LucidError } from "../../../utils/errors/index.js";
import abortUploadSessionService from "../abort-upload-session.js";

const input = z.object({ sessionId: z.string().min(1) });

const abortUploadSession: JobService<z.infer<typeof input>> = async ({
	context,
	input,
}) => {
	return abortUploadSessionService(context, {
		sessionId: input.sessionId,
		userId: null,
	});
};

export const abortUploadSessionJob = defineJob({
	key: "core:abort-media-upload",
	version: 1,
	input,
	handler: async (args) => {
		const result = await abortUploadSession(args);
		if (result.error) throw new LucidError(result.error);
	},
	describe: ({ input: { sessionId } }) => ({ sessionId }),
});
