import { OptionsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getStorageUsage from "../get-storage-usage.js";

/**
 * Recalculates and updates media storage usage.
 */
const updateMediaStorage: ServiceFn<[], undefined> = async (context) => {
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

export default updateMediaStorage;
