import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import { CollectionsRepository } from "../../../libs/repositories/index.js";

const input = z.object({ collectionKey: z.string().min(1) });

const deleteCollection: JobHandler<z.infer<typeof input>> = async (
	context,
	data,
) => {
	const Collections = new CollectionsRepository(context.db);

	const deleteRes = await Collections.deleteSingle({
		where: [
			{
				key: "key",
				operator: "=",
				value: data.collectionKey,
			},
		],
		returning: ["key"],
		validation: {
			enabled: true,
		},
	});
	if (deleteRes.error) return deleteRes;

	return {
		error: undefined,
		data: undefined,
	};
};

/**
 * Deletes a single collection
 */
export const deleteCollectionJob = defineJob({
	name: "core:delete-collection",
	version: 1,
	input,
	handler: deleteCollection,
	describe: ({ collectionKey }) => ({ collectionKey }),
});
