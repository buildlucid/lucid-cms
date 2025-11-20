import mime from "mime-types";
import {
	MediaRepository,
	MediaAwaitingSyncRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import { generateKey } from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices } from "../index.js";

const getPresignedUrl: ServiceFn<
	[
		{
			fileName: string;
			mimeType: string;
			public: boolean;
		},
	],
	{
		url: string;
		key: string;
		headers?: Record<string, string>;
	}
> = async (context, data) => {
	const Media = new MediaRepository(context.db, context.config.db);
	const MediaAwaitingSync = new MediaAwaitingSyncRepository(
		context.db,
		context.config.db,
	);

	const extension = mime.extension(data.mimeType);

	const keyRes = generateKey({
		name: data.fileName,
		extension: extension || null,
		public: data.public,
	});
	if (keyRes.error) return keyRes;

	const duplicateKeyRes = await Media.selectSingle({
		select: ["key"],
		where: [
			{
				key: "key",
				operator: "=",
				value: keyRes.data,
			},
		],
	});
	if (duplicateKeyRes.error) return duplicateKeyRes;

	if (duplicateKeyRes.data !== undefined) {
		return {
			error: {
				type: "basic",
				name: T("media_duplicate_key_error_name"),
				message: T("media_duplicate_key_error_message"),
				status: 400,
			},
			data: undefined,
		};
	}

	const [createMediaRes, getPresignedUrlRes] = await Promise.all([
		MediaAwaitingSync.createSingle({
			data: {
				key: keyRes.data,
				timestamp: new Date().toISOString(),
			},
			returning: ["key"],
			validation: {
				enabled: true,
			},
		}),
		mediaServices.strategies.getPresignedUrl(context, {
			key: keyRes.data,
			mimeType: data.mimeType,
			extension: extension || undefined,
		}),
	]);
	if (createMediaRes.error) return createMediaRes;
	if (getPresignedUrlRes.error) return getPresignedUrlRes;

	return {
		error: undefined,
		data: {
			url: getPresignedUrlRes.data.url,
			key: keyRes.data,
			headers: getPresignedUrlRes.data.headers,
		},
	};
};

export default getPresignedUrl;
