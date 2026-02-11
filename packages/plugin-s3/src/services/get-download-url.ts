import type { MediaAdapterServiceGetDownloadUrl } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import { PRESIGNED_URL_EXPIRY } from "../constants.js";
import T from "../translations/index.js";
import type { PluginOptions } from "../types/types.js";

export default (client: AwsClient, pluginOptions: PluginOptions) => {
	const getDownloadUrl: MediaAdapterServiceGetDownloadUrl = async (key) => {
		try {
			const objectUrl = new URL(
				`${pluginOptions.endpoint}/${pluginOptions.bucket}/${key}`,
			);
			objectUrl.searchParams.set("X-Amz-Expires", String(PRESIGNED_URL_EXPIRY));

			const fileName = key.split("/").filter(Boolean).at(-1) ?? key;
			objectUrl.searchParams.set(
				"response-content-disposition",
				`attachment; filename="${fileName}"`,
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
						e instanceof Error ? e.message : T("an_unknown_error_occurred"),
				},
				data: undefined,
			};
		}
	};

	return getDownloadUrl;
};
