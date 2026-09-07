import {
	MediaAwaitingSyncRepository,
	MediaRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkHasMediaStorage from "../checks/check-has-media-storage.js";

/** Keeps registered files and retains failed deletions for the next cleanup attempt. */
const deletePendingUpload: ServiceFn<[{ key: string }], undefined> = async (
	context,
	data,
) => {
	const storage = await checkHasMediaStorage(context);
	if (storage.error) return storage;

	const Media = new MediaRepository(context.db);
	const MediaAwaitingSync = new MediaAwaitingSyncRepository(context.db);

	const media = await Media.selectSingle({
		select: ["id"],
		where: [{ key: "key", operator: "=", value: data.key }],
	});
	if (media.error) return media;

	if (!media.data) {
		const deleted = await storage.data.delete(context, data);
		if (deleted.error) return deleted;
	}

	const cleared = await MediaAwaitingSync.deleteSingle({
		where: [{ key: "key", operator: "=", value: data.key }],
	});
	if (cleared.error) return cleared;

	return { error: undefined, data: undefined };
};

export default deletePendingUpload;
