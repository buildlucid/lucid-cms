import { OptionsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getStorageUsage from "../get-storage-usage.js";

/**
 * Recalculates and updates the media storage usage option
 */
const updateMediaStorage: ServiceFn<[], undefined> = async (context) => {
	const Options = new OptionsRepository(context.db.client, context.config.db);

	const storageUsageRes = await getStorageUsage(context);
	if (storageUsageRes.error) return storageUsageRes;

	const updateMediaStorageRes = await Options.updateSingle({
		where: [
			{
				key: "name",
				operator: "=",
				value: "media_storage_used",
			},
		],
		data: {
			value_int: storageUsageRes.data.total,
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
