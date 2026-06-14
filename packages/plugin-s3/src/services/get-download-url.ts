import { copy } from "@lucidcms/core/plugin";
import type { MediaAdapterServiceGetDownloadUrl } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import { PRESIGNED_URL_EXPIRY } from "../constants.js";
import type { PluginOptions } from "../types/types.js";
import buildDownloadContentDisposition from "../utils/build-download-content-disposition.js";

export default (client: AwsClient, pluginOptions: PluginOptions) => {
	const getDownloadUrl: MediaAdapterServiceGetDownloadUrl = async ({
		key,
		meta,
	}) => {
		try {
			const objectUrl = new URL(
				`${pluginOptions.endpoint}/${pluginOptions.bucket}/${key}`,
			);
			objectUrl.searchParams.set("X-Amz-Expires", String(PRESIGNED_URL_EXPIRY));
			objectUrl.searchParams.set(
				"response-content-disposition",
				buildDownloadContentDisposition({
					key,
					fileName: meta.fileName,
					extension: meta.extension,
				}),
			);

			const response = await client.sign(
				new Request(objectUrl.toString(), {
					method: "GET",
				}),
				{
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
			return {
				error: {
					type: "plugin",
					message:
						e instanceof Error
							? copy.literal(e.message)
							: copy("server:plugin.s3.errors.unknown"),
				},
				data: undefined,
			};
		}
	};

	return getDownloadUrl;
};
