import T from "../../translations/index.js";
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

	if (!data.fallback || !context.config.media.fallback) {
		return {
			error: {
				type: "basic",
				name: T("media_not_found_name"),
				message: T("media_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const dest = data.secFetchDest ?? "";

	if (dest === "image" && context.config.media.fallback.image) {
		return {
			error: undefined,
			data: {
				redirectUrl: context.config.media.fallback.image,
			},
		};
	}

	if (dest === "video" && context.config.media.fallback.video) {
		return {
			error: undefined,
			data: {
				redirectUrl: context.config.media.fallback.video,
			},
		};
	}

	return {
		error: {
			type: "basic",
			name: T("media_not_found_name"),
			message: T("media_not_found_message"),
			status: 404,
		},
		data: undefined,
	};
};

export default streamFallbackMedia;
