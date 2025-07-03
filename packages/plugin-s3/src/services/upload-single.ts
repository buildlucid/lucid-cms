import type { AwsClient } from "aws4fetch";
import type { PluginOptions } from "../types/types.js";
import type { MediaStrategyUploadSingle } from "@lucidcms/core/types";

export default (client: AwsClient, pluginOptions: PluginOptions) => {
	const uploadSingle: MediaStrategyUploadSingle = async (props) => {
		try {
			const response = await client.sign(
				new Request(
					`${pluginOptions.endpoint}/${pluginOptions.bucket}/${props.key}`,
					{
						method: "PUT",
						body: props.data as unknown as BodyInit,
						headers: {
							"Content-Type": props.meta.mimeType,
							"x-amz-meta-extension": props.meta.extension || "",
						},
					},
				),
			);

			const result = await fetch(response);

			if (!result.ok) {
				throw new Error(`Upload failed: ${result.statusText}`);
			}

			const etag = result.headers.get("etag")?.replace(/"/g, "");

			return {
				error: undefined,
				data: {
					etag,
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

	return uploadSingle;
};
