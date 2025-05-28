import type { Readable } from "node:stream";
import type { ServiceFn } from "../../utils/services/types.js";

const streamMedia: ServiceFn<
	[
		{
			key: string;
		},
	],
	{
		key: string;
		contentLength: number | undefined;
		contentType: string | undefined;
		body: Readable;
	}
> = async (context, data) => {
	const mediaStrategyRes =
		context.services.media.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const mediaRes = await mediaStrategyRes.data.stream(data.key);
	if (mediaRes.error) return mediaRes;

	return {
		error: undefined,
		data: {
			key: data.key,
			contentLength: mediaRes.data.contentLength,
			contentType: mediaRes.data.contentType,
			body: mediaRes.data.body,
		},
	};
};

export default streamMedia;
