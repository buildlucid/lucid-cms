import type { ServiceFn } from "../../../utils/services/types.js";
import adjustStorageUsage from "../adjust-storage-usage.js";
import checkHasMediaStorage from "../checks/check-has-media-storage.js";
import deleteFilesAfterCommit from "../helpers/delete-files-after-commit.js";

/** Frees a file's storage, and deletes it with its processed images once the transaction commits. */
const deleteObject: ServiceFn<
	[
		{
			key: string;
			size: number;
			processedKeys: string[];
			processedSize: number;
		},
	],
	undefined
> = async (context, data) => {
	const mediaStorageRes = await checkHasMediaStorage(context);
	if (mediaStorageRes.error) return mediaStorageRes;

	const updateStorageRes = await adjustStorageUsage(context, {
		delta: -(data.size + data.processedSize),
		min: 0,
	});
	if (updateStorageRes.error) return updateStorageRes;

	await deleteFilesAfterCommit(context, [...data.processedKeys, data.key]);

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteObject;
