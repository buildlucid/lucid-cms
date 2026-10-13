import { MediaAwaitingSyncRepository } from "../../../libs/repositories/index.js";
import { generateKey, getFileMetadata } from "../../../utils/media/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkCanStoreMedia from "../checks/check-can-store-media.js";
import checkHasMediaStorage from "../checks/check-has-media-storage.js";
import deletePendingUpload from "./delete-pending-upload.js";
import { boundUploadBody, type normalizeUploadFile } from "./upload-file.js";

/** Stores a file under a claimable key that expires and is deleted if unused. */
const storePendingUpload: ServiceFn<
	[
		{
			file: ReturnType<typeof normalizeUploadFile>;
			public: boolean;
			/** Stores the file under a temporary key, for replacing an existing media item's file. */
			temporary?: boolean;
			maxBytes?: number;
		},
	],
	{ key: string }
> = async (context, input) => {
	const storage = await checkHasMediaStorage(context);
	if (storage.error) return storage;

	const size = await checkCanStoreMedia(context, {
		size: input.file.size,
		maxBytes: input.maxBytes,
	});
	if (size.error) return size;

	const metadata = await getFileMetadata({
		fileName: input.file.fileName,
		mimeType: input.file.mimeType || null,
	});
	if (metadata.error) return metadata;

	const key = generateKey({
		name: input.file.fileName,
		public: input.public,
		temporary: input.temporary,
	});
	if (key.error) return key;

	const MediaAwaitingSync = new MediaAwaitingSyncRepository(context.db);
	const tracked = await MediaAwaitingSync.createSingle({
		data: { key: key.data, timestamp: new Date().toISOString() },
		validation: { enabled: true },
	});
	if (tracked.error) return tracked;

	//* a failed or thrown upload clears the pending key and anything partly stored
	let stored = false;
	try {
		const upload = await storage.data.upload(context, {
			key: key.data,
			body: boundUploadBody(input.file),
			size: input.file.size,
			mimeType: metadata.data.mimeType,
			extension: metadata.data.extension,
			type: metadata.data.type,
		});
		if (upload.error) return upload;

		stored = true;
		return { error: undefined, data: { key: key.data } };
	} finally {
		if (!stored) await deletePendingUpload(context, { key: key.data });
	}
};

export default storePendingUpload;
