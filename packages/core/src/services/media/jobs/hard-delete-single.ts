import z from "zod";
import defineJob from "../../../libs/queue/define-job.js";
import type { JobHandler } from "../../../libs/queue/types.js";
import permanentlyDeleteMedia from "../helpers/permanently-delete-media.js";

const input = z.object({ mediaId: z.number().int().positive() });

const hardDeleteSingleMedia: JobHandler<z.infer<typeof input>> = async (
	context,
	data,
) => {
	const deleteRes = await permanentlyDeleteMedia(context, {
		id: data.mediaId,
	});
	if (deleteRes.error) return deleteRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export const hardDeleteSingleMediaJob = defineJob({
	name: "lucid:media.delete",
	version: 1,
	input,
	handler: hardDeleteSingleMedia,
	describe: ({ mediaId }) => ({ mediaId }),
});
