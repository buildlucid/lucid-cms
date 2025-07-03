import { PRESIGNED_URL_EXPIRY } from "../constants.js";
import type { AwsClient } from "aws4fetch";
import type { PluginOptions } from "../types/types.js";
import type { MediaStrategyGetPresignedUrl } from "@lucidcms/core/types";

export default (client: AwsClient, pluginOptions: PluginOptions) => {
	const getPresignedUrl: MediaStrategyGetPresignedUrl = async (key, meta) => {
		try {
			const response = await client.sign(
				new Request(
					`${pluginOptions.endpoint}/${pluginOptions.bucket}/${key}?X-Amz-Expires=${PRESIGNED_URL_EXPIRY}`,
					{
						method: "PUT",
					},
				),
				{
					// headers: {
					// 	"Content-Type": meta.mimeType,
					// 	"x-amz-meta-extension": meta.extension || "",
					// },
					aws: { signQuery: true },
				},
			);

			return {
				error: undefined,
				data: {
					url: response.url.toString(),
				},
			};
		} catch (e) {
			const error = e as Error;
			return {
				error: {
					message: error.message,
				},
				data: undefined,
			};
		}
	};

	return getPresignedUrl;
};
