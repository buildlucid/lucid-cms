import type { Media } from "../../exports/types.js";
import type {
	MediaCropInput,
	MediaOrigin,
	MediaType,
} from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkFolderAccess from "../media-folders/checks/check-folder-access.js";
import checkAwaitingSync from "./checks/check-awaiting-sync.js";
import cleanupFailedCreate from "./helpers/cleanup-failed-create.js";
import registerUploadedMedia from "./helpers/register-uploaded-media.js";
import syncMedia from "./strategies/sync-media.js";

const createSingle: ServiceFn<
	[
		{
			key: string;
			fileName: string;
			folderId?: number | null;
			isHidden?: boolean;
			origin: MediaOrigin;
			aiGenerationRequestId?: string;
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
			posterId?: number | null;
			crop?: MediaCropInput;
			expectedSize?: number;
			validation?: { maxBytes?: number; mimeTypes?: readonly string[] };
			allowedType?: MediaType;
			userId: number | null;
		},
	],
	Media
> = async (context, data) => {
	const folderAccessRes = await checkFolderAccess(context, {
		folderId: data.folderId,
	});
	if (folderAccessRes.error) return folderAccessRes;

	const awaitingSyncRes = await checkAwaitingSync(context, {
		key: data.key,
	});
	if (awaitingSyncRes.error) return awaitingSyncRes;

	const syncMediaRes = await syncMedia(context, {
		key: data.key,
		fileName: data.fileName,
		allowedType: data.allowedType,
		expectedSize: data.expectedSize,
		validation: data.validation,
	});
	if (syncMediaRes.error) return syncMediaRes;

	let registered = false;
	try {
		const result = await registerUploadedMedia(
			context,
			data,
			syncMediaRes.data,
		);
		registered = !result.error;
		return result;
	} finally {
		if (!registered) {
			await cleanupFailedCreate(context, {
				key: syncMediaRes.data.key,
				size: syncMediaRes.data.size,
			});
		}
	}
};

export default createSingle;
