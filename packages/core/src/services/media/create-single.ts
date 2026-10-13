import type { Media } from "../../exports/types.js";
import type {
	MediaCropInput,
	MediaOrigin,
	MediaType,
} from "../../types/response.js";
import type { MediaActor } from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkFolderAccess from "../media-folders/checks/check-folder-access.js";
import checkAwaitingSync from "./checks/check-awaiting-sync.js";
import checkHasMediaStorage from "./checks/check-has-media-storage.js";
import registerUploadedMedia from "./helpers/register-uploaded-media.js";
import syncMedia from "./strategies/sync-media.js";

const createSingle: ServiceFn<
	[
		{
			key: string;
			fileName: string;
			folderId?: number | null;
			/** Makes the media personal to this user, such as an agent chat upload or a profile picture. */
			ownerUserId?: number | null;
			/** Marks media another record manages, such as an OAuth client logo. */
			isSystem?: boolean;
			origin: MediaOrigin;
			aiGenerationRequestId?: string;
			title?: { localeCode: string | null; value: string | null }[];
			alt?: { localeCode: string | null; value: string | null }[];
			description?: { localeCode: string | null; value: string | null }[];
			summary?: { localeCode: string | null; value: string | null }[];
			transcript?: { localeCode: string | null; value: string | null }[];
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
			actor: MediaActor;
			userId: number | null;
			agentRunId?: string;
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

	//* the transaction rolls back failed database writes, but the stored file has to be deleted
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
			const storage = await checkHasMediaStorage(context);
			if (storage.data) {
				await storage.data.delete(context, { key: syncMediaRes.data.key });
			}
		}
	}
};

export default createSingle;
