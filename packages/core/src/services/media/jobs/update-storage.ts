import z from "zod";
import defineJob from "../../../libs/queue/define-job.js";
import type { JobHandler } from "../../../libs/queue/types.js";
import { OptionsRepository } from "../../../libs/repositories/index.js";
import getStorageUsage from "../get-storage-usage.js";

const input = z.object({});

const updateMediaStorage: JobHandler<z.infer<typeof input>> = async (
	context,
) => {
	const Options = new OptionsRepository(context.db);
	const storageUsageRes = await getStorageUsage(context);
	if (storageUsageRes.error) return storageUsageRes;

	const updateMediaStorageRes = await Options.upsertSingle({
		data: {
			name: "media_storage_used",
			value_int: storageUsageRes.data.total,
			value_text: null,
			value_bool: null,
		},
		returning: ["name"],
		validation: {
			enabled: true,
		},
	});
	if (updateMediaStorageRes.error) return updateMediaStorageRes;

	return {
		error: undefined,
		data: undefined,
	};
};

/**
 * Recalculates and updates media storage usage.
 */
export const updateMediaStorageJob = defineJob({
	name: "lucid:media.update-storage",
	version: 1,
	input,
	handler: updateMediaStorage,
});
