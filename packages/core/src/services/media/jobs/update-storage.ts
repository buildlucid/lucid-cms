import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobService } from "../../../libs/jobs/types.js";
import { OptionsRepository } from "../../../libs/repositories/index.js";
import { LucidError } from "../../../utils/errors/index.js";
import getStorageUsage from "../get-storage-usage.js";

const updateMediaStorage: JobService = async ({ context }) => {
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
	key: "core:recalculate-media-storage",
	version: 1,
	input: z.null(),
	schedules: [
		{
			key: "automatic",
			cron: "0 0 * * *",
			timezone: "UTC",
			input: null,
		},
	],
	handler: async (args) => {
		const result = await updateMediaStorage(args);
		if (result.error) throw new LucidError(result.error);
	},
});
