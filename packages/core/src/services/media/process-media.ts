import type { MediaProcessOptions } from "@lucidcms/types";
import { MediaRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { MediaUrl } from "../../types/response.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import {
	createMediaUrl,
	isProcessedImageKey,
	normalizeMediaKey,
	resolveProcessingRequest,
} from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices } from "../index.js";

const processMedia: ServiceFn<
	[
		{
			key: string;
			body: MediaProcessOptions;
		},
	],
	MediaUrl
> = async (context, data) => {
	const baseUrl = getBaseUrl(context);
	const normalizedKey = normalizeMediaKey(data.key);

	if (isProcessedImageKey(normalizedKey)) {
		return {
			error: {
				type: "basic",
				status: 404,
				name: T("media_not_found_name"),
				message: T("media_not_found_message"),
			},
			data: undefined,
		};
	}

	const Media = new MediaRepository(context.db.client, context.config.db);

	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	//* fetches the media item, if its not an image return the original url
	const mediaRes = await Media.selectSingle({
		select: ["type", "key", "file_name"],
		where: [
			{
				key: "key",
				operator: "=",
				value: normalizedKey,
			},
		],
	});
	if (mediaRes.error) return mediaRes;
	if (!mediaRes.data) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: T("media_not_found_message"),
			},
			data: undefined,
		};
	}
	if (mediaRes.data?.type !== "image") {
		return {
			error: undefined,
			data: {
				url: createMediaUrl({
					key: mediaRes.data.key,
					host: baseUrl,
					fileName: mediaRes.data.file_name,
				}),
			},
		};
	}

	const processingRequest = resolveProcessingRequest({
		presets: context.config.media.images.presets,
		onDemandFormats: context.config.media.images.onDemandFormats,
		query: data.body,
	});

	if (!processingRequest.hasProcessing) {
		return {
			error: undefined,
			data: {
				url: createMediaUrl({
					key: mediaRes.data.key,
					host: baseUrl,
					fileName: mediaRes.data.file_name,
				}),
			},
		};
	}

	return {
		error: undefined,
		data: {
			url: createMediaUrl({
				key: mediaRes.data.key,
				host: baseUrl,
				fileName: mediaRes.data.file_name,
				query: processingRequest.publicQuery,
			}),
		},
	};
};

export default processMedia;
