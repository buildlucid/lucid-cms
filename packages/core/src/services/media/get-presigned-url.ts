import mime from "mime-types";
import { MediaAwaitingSyncRepository } from "../../libs/repositories/index.js";
import { generateKey } from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices } from "../index.js";

const getPresignedUrl: ServiceFn<
	[
		{
			fileName: string;
			mimeType: string;
			public: boolean;
			temporary?: boolean;
		},
	],
	{
		url: string;
		key: string;
		headers?: Record<string, string>;
	}
> = async (context, data) => {
	const MediaAwaitingSync = new MediaAwaitingSyncRepository(
		context.db.client,
		context.config.db,
	);

	const extension = mime.extension(data.mimeType);

	const keyRes = generateKey({
		name: data.fileName,
		public: data.public,
		temporary: data.temporary,
	});
	if (keyRes.error) return keyRes;

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
