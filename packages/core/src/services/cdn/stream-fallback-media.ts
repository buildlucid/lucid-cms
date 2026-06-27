import { copy } from "../../libs/i18n/index.js";
import type { LucidErrorData } from "../../types/errors.js";
import type { ServiceFn } from "../../utils/services/types.js";

const streamFallbackMedia: ServiceFn<
	[
		{
			fallback?: boolean;
			secFetchDest?: string;
			error: LucidErrorData;
		},
	],
	{
		redirectUrl: string;
	}
> = async (context, data) => {
	if (data.error.status !== 404) {
		return {
			error: data.error,
			data: undefined,
		};
	}

	if (!data.fallback) {
		return {
			error: {
				type: "basic",
				name: copy("server:core.media.not.found.name"),
				message: copy("server:core.media.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const dest = data.secFetchDest ?? "";
	const imageFallbackUrl = context.config.media.images.fallbackUrl;
	const videoFallbackUrl = context.config.media.video.fallbackUrl;

	if (dest === "image" && imageFallbackUrl) {
		return {
			error: undefined,
			data: {
				redirectUrl: imageFallbackUrl,
			},
		};
	}

	if (dest === "video" && videoFallbackUrl) {
		return {
			error: undefined,
			data: {
				redirectUrl: videoFallbackUrl,
			},
		};
	}

	return {
		error: {
			type: "basic",
			name: copy("server:core.media.not.found.name"),
			message: copy("server:core.media.not.found.message"),
			status: 404,
		},
		data: undefined,
	};
};

export default streamFallbackMedia;
