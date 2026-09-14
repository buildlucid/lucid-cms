import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import permanentlyDeleteMedia from "../helpers/permanently-delete-media.js";

const input = z.object({ mediaId: z.number().int().positive() });

const hardDeleteSingleMedia: JobHandler<z.infer<typeof input>> = async ({
	context,
	input,
}) => {
	const deleteRes = await permanentlyDeleteMedia(context, {
		id: input.mediaId,
	});
	if (deleteRes.error) return deleteRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export const hardDeleteSingleMediaJob = defineJob({
	name: "core:delete-media",
	version: 1,
	input,
	handler: hardDeleteSingleMedia,
	describe: ({ input: { mediaId } }) => ({ mediaId }),
});
