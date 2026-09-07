import type { MediaStorageAdapterInstance } from "../../libs/media-storage/types.js";
import { MediaRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkHasMediaStorage from "./checks/check-has-media-storage.js";

/** Reads the original file for a registered, active media item. */
const stream: ServiceFn<
	[{ id: number; range?: { start: number; end?: number } }],
	NonNullable<
		Awaited<ReturnType<MediaStorageAdapterInstance["stream"]>>["data"]
	> & {
		fileName: string | null;
	}
> = async (context, data) => {
	const storage = await checkHasMediaStorage(context);
	if (storage.error) return storage;

	const Media = new MediaRepository(context.db);

	const media = await Media.selectSingle({
		select: ["key", "file_name"],
		where: [
			{ key: "id", operator: "=", value: data.id },
			{ key: "is_deleted", operator: "=", value: false },
		],
		validation: { enabled: true, defaultError: { status: 404 } },
	});
	if (media.error) return media;

	const result = await storage.data.stream(context, {
		key: media.data.key,
		range: data.range,
	});
	if (result.error) return result;

	return {
		error: undefined,
		data: { ...result.data, fileName: media.data.file_name },
	};
};

export default stream;
