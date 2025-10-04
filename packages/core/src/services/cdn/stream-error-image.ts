import T from "../../translations/index.js";
import pipeRemoteUrl from "./helpers/pipe-remote-url.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { LucidErrorData } from "../../types/errors.js";

const streamErrorImage: ServiceFn<
	[
		{
			fallback?: boolean;
			error: LucidErrorData;
		},
	],
	{
		body: Buffer;
		contentType: string;
	}
> = async (context, data) => {
	try {
		if (data.error.status !== 404) {
			return {
				error: data.error,
				data: undefined,
			};
		}

		if (!data.fallback || !context.config.media.fallbackImage) {
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

		const { buffer, contentType } = await pipeRemoteUrl({
			url: context.config.media?.fallbackImage,
		});

		return {
			error: undefined,
			data: {
				body: buffer,
				contentType: contentType || "image/jpeg",
			},
		};
	} catch (err) {
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
};

export default streamErrorImage;
