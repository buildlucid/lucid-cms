import { MediaRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import adjustStorageUsage from "../adjust-storage-usage.js";
import checkHasMediaStorage from "../checks/check-has-media-storage.js";
import permanentlyDeleteMedia from "./permanently-delete-media.js";

/** Removes failed uploads and reverses database writes when rollback is unavailable. */
const cleanupFailedCreate: ServiceFn<
	[{ key: string; size: number }],
	undefined
> = async (context, data) => {
	const storage = await checkHasMediaStorage(context);
	if (storage.error) return storage;

	if (!context.db.isTransaction) {
		const Media = new MediaRepository(context.db);
		const created = await Media.selectSingle({
			select: ["id"],
			where: [{ key: "key", operator: "=", value: data.key }],
		});
		if (created.error) return created;

		if (created.data) {
			return permanentlyDeleteMedia(context, { id: created.data.id });
		}

		const adjusted = await adjustStorageUsage(context, {
			delta: -data.size,
			min: 0,
		});
		if (adjusted.error) return adjusted;
	}

	return storage.data.delete(context, { key: data.key });
};

export default cleanupFailedCreate;
