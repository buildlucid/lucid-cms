import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobService } from "../../../libs/jobs/types.js";
import { LucidError } from "../../../utils/errors/index.js";
import permanentlyDeleteMedia from "../helpers/permanently-delete-media.js";

const input = z.object({ mediaId: z.number().int().positive() });

const hardDeleteSingleMedia: JobService<z.infer<typeof input>> = async ({
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
	key: "core:delete-media",
	version: 1,
	input,
	handler: async (args) => {
		const result = await hardDeleteSingleMedia(args);
		if (result.error) throw new LucidError(result.error);
	},
	describe: ({ input: { mediaId } }) => ({ mediaId }),
});
