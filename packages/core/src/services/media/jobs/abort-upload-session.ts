import z from "zod";
import defineJob from "../../../libs/queue/define-job.js";
import type { JobHandler } from "../../../libs/queue/types.js";
import abortUploadSessionService from "../abort-upload-session.js";

const input = z.object({ sessionId: z.string().min(1) });

const abortUploadSession: JobHandler<z.infer<typeof input>> = async (
	context,
	data,
) => {
	return abortUploadSessionService(context, {
		sessionId: data.sessionId,
	});
};

export const abortUploadSessionJob = defineJob({
	name: "lucid:media.abort-upload-session",
	version: 1,
	input,
	handler: abortUploadSession,
	describe: ({ sessionId }) => ({ sessionId }),
});
