import type { MediaAdapterServiceUploadSingle } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import T from "../translations/index.js";
import type { PluginOptions } from "../types/types.js";

export default (client: AwsClient, pluginOptions: PluginOptions) => {
	const uploadSingle: MediaAdapterServiceUploadSingle = async (props) => {
		try {
			const headers = new Headers();

			if (props.meta.mimeType) headers.set("Content-Type", props.meta.mimeType);
			if (props.meta.extension)
				headers.set("x-amz-meta-extension", props.meta.extension);

			const response = await client.sign(
				new Request(
					`${pluginOptions.endpoint}/${pluginOptions.bucket}/${props.key}`,
					{
						method: "PUT",
						body: props.data as unknown as BodyInit,
						headers: headers,
					},
				),
			);

			const result = await fetch(response);

			if (!result.ok) {
				return {
					error: {
						type: "plugin",
						message: T("upload_failed", {
							status: result.status,
							statusText: result.statusText,
						}),
					},
					data: undefined,
				};
			}

			const etag = result.headers.get("etag")?.replace(/"/g, "");

			return {
				error: undefined,
				data: {
					etag,
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

	return uploadSingle;
};
