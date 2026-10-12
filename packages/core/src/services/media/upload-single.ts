import formatter from "../../libs/formatters/helpers.js";
import { copy } from "../../libs/i18n/index.js";
import { MediaRepository } from "../../libs/repositories/index.js";
import type { MediaOrigin } from "../../types/response.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import type { ServiceFn } from "../../utils/services/types.js";
import createSingle from "./create-single.js";
import deletePendingUpload from "./helpers/delete-pending-upload.js";
import storePendingUpload from "./helpers/store-pending-upload.js";
import {
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
			/** Marks media another record manages. Only applies to new media. */
			isSystem?: boolean;
			/** Creates personal media owned by this user. */
			ownerUserId?: number | null;
			origin?: MediaOrigin;
			/** The Lucid AI request that produced the file, for AI origins. */
			aiGenerationRequestId?: string;
			folderId?: number | null;
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
			validation?: { maxBytes?: number; mimeTypes?: readonly string[] };
			file: MediaUploadFile;
		},
	],
	{ id: number }
> = async (context, input) => {
	const file = normalizeUploadFile(input.file);

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

	const stored = await storePendingUpload(context, {
		file,
		public: isPublic,
		maxBytes: input.validation?.maxBytes,
	});
	if (stored.error) return stored;
	const key = stored.data.key;

	let registered = false;
	try {
		if (input.id !== undefined) {
			const result = await serviceWrapper(updateSingle, { transaction: true })(
				context,
				{
					...input,
					id: input.id,
					key,
					fileName: file.fileName,
					expectedSize: file.size,
					actor: { type: "internal" },
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
				key,
				fileName: file.fileName,
				expectedSize: file.size,
				origin: input.origin ?? "human",
				actor: { type: "internal" },
			},
		);
		if (result.error) return result;

		registered = true;
		return { error: undefined, data: { id: result.data.id } };
	} finally {
		if (!registered) await deletePendingUpload(context, { key });
	}
};

export default uploadSingle;
