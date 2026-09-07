import formatter from "../../libs/formatters/helpers.js";
import { copy } from "../../libs/i18n/index.js";
import {
	MediaAwaitingSyncRepository,
	MediaRepository,
} from "../../libs/repositories/index.js";
import type { MediaOrigin } from "../../types/response.js";
import { generateKey, getFileMetadata } from "../../utils/media/index.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkCanStoreMedia from "./checks/check-can-store-media.js";
import checkHasMediaStorage from "./checks/check-has-media-storage.js";
import createSingle from "./create-single.js";
import deletePendingUpload from "./helpers/delete-pending-upload.js";
import {
	boundUploadBody,
	type MediaUploadFile,
	normalizeUploadFile,
} from "./helpers/upload-file.js";
import updateSingle from "./update-single.js";

/** Stores a file, then registers it through the same service used by the admin API. */
const uploadSingle: ServiceFn<
	[
		{
			id?: number;
			userId: number | null;
			public?: boolean;
			isHidden?: boolean;
			origin?: MediaOrigin;
			folderId?: number | null;
			title?: { localeCode: string | null; value: string | null }[];
			alt?: { localeCode: string | null; value: string | null }[];
			description?: { localeCode: string | null; value: string | null }[];
			summary?: { localeCode: string | null; value: string | null }[];
			width?: number;
			height?: number;
			duration?: number | null;
			focalPoint?: { x: number; y: number };
			blurHash?: string;
			averageColor?: string;
			base64?: string | null;
			isDark?: boolean;
			isLight?: boolean;
			validation?: { maxBytes?: number; mimeTypes?: readonly string[] };
			file: MediaUploadFile;
		},
	],
	{ id: number }
> = async (context, input) => {
	const file = normalizeUploadFile(input.file);

	const storage = await checkHasMediaStorage(context);
	if (storage.error) return storage;

	if (context.db.isTransaction) {
		return {
			error: {
				status: 400,
				code: "invalid_request",
				message: copy("server:core.media.upload.transaction"),
			},
			data: undefined,
		};
	}

	const size = await checkCanStoreMedia(context, {
		size: file.size,
		maxBytes: input.validation?.maxBytes,
	});
	if (size.error) return size;

	const metadata = await getFileMetadata({
		fileName: file.fileName,
		mimeType: file.mimeType || null,
	});
	if (metadata.error) return metadata;

	const Media = new MediaRepository(context.db);
	const existing =
		input.id === undefined
			? undefined
			: await Media.selectSingle({
					select: ["public"],
					where: [
						{ key: "id", operator: "=", value: input.id },
						{ key: "is_deleted", operator: "=", value: false },
						{ key: "parent_media_id", operator: "is", value: null },
					],
					validation: { enabled: true, defaultError: { status: 404 } },
				});
	if (existing?.error) return existing;

	const isPublic =
		input.public ??
		(existing ? formatter.formatBoolean(existing.data.public) : false);

	const key = generateKey({ name: file.fileName, public: isPublic });
	if (key.error) return key;

	const pending = new MediaAwaitingSyncRepository(context.db);
	const tracked = await pending.createSingle({
		data: { key: key.data, timestamp: new Date().toISOString() },
		validation: { enabled: true },
	});
	if (tracked.error) return tracked;

	let registered = false;
	try {
		const stored = await storage.data.upload(context, {
			key: key.data,
			body: boundUploadBody(file),
			size: file.size,
			mimeType: metadata.data.mimeType,
			extension: metadata.data.extension,
			type: metadata.data.type,
		});
		if (stored.error) return stored;

		if (input.id !== undefined) {
			const result = await serviceWrapper(updateSingle, { transaction: true })(
				context,
				{
					...input,
					id: input.id,
					key: key.data,
					fileName: file.fileName,
					expectedSize: file.size,
				},
			);
			if (result.error) return result;

			registered = true;
			return { error: undefined, data: { id: result.data } };
		}

		const result = await serviceWrapper(createSingle, { transaction: true })(
			context,
			{
				...input,
				key: key.data,
				fileName: file.fileName,
				expectedSize: file.size,
				origin: input.origin ?? "human",
			},
		);
		if (result.error) return result;

		registered = true;
		return { error: undefined, data: { id: result.data.id } };
	} finally {
		if (!registered) await deletePendingUpload(context, { key: key.data });
	}
};

export default uploadSingle;
