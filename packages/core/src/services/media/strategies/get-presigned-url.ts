import type { ServiceFn } from "../../../utils/services/types.js";
import { mediaServices } from "../../index.js";

const getPresignedUrl: ServiceFn<
	[
		{
			key: string;
			mimeType: string;
			extension?: string;
		},
	],
	{
		url: string;
		headers?: Record<string, string>;
	}
> = async (context, data) => {
	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const presignedUrlRes = await mediaStrategyRes.data.services.getPresignedUrl(
		data.key,
		{
			host: context.config.host,
			mimeType: data.mimeType,
			extension: data.extension,
		},
	);

	if (presignedUrlRes.error) {
		return {
			error: {
				type: "basic",
				message: presignedUrlRes.error.message,
				status: 500,
				errors: {
					file: {
						code: "media_error",
						message: presignedUrlRes.error.message,
					},
				},
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: presignedUrlRes.data,
	};
};

export default getPresignedUrl;
