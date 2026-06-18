import { OptionsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getStorageUsage from "../get-storage-usage.js";
import { getMediaStorageOptionName } from "../helpers/storage-usage-options.js";

/**
 * Recalculates and updates the media storage usage options
 */
const updateMediaStorage: ServiceFn<[], undefined> = async (context) => {
	const Options = new OptionsRepository(context.db.client, context.config.db);

	const [storageUsageRes, existingOptionsRes] = await Promise.all([
		getStorageUsage(context, {
			grouped: true,
		}),
		Options.selectMediaStorageUsageOptions(),
	]);
	if (storageUsageRes.error) return storageUsageRes;
	if (existingOptionsRes.error) return existingOptionsRes;

	const storageValues = new Map(
		existingOptionsRes.data.map((option) => [option.name, 0]),
	);
	storageValues.set("media_storage_used", 0);

	for (const bucket of storageUsageRes.data.buckets ?? []) {
		storageValues.set(
			getMediaStorageOptionName(bucket.tenantKey),
			bucket.total,
		);
	}

	for (const [name, value] of storageValues.entries()) {
		const updateMediaStorageRes = await Options.upsertSingle({
			data: {
				name,
				value_int: value,
				value_text: null,
				value_bool: null,
			},
			returning: ["name"],
			validation: {
				enabled: true,
			},
		});
		if (updateMediaStorageRes.error) return updateMediaStorageRes;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateMediaStorage;
