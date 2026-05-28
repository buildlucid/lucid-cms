import { serverText } from "@lucidcms/core/plugin";
import type { MediaAdapterServiceGetMeta } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import type { PluginOptions } from "../types/types.js";
import { METADATA_SIZE_HEADER, parseStoredSize } from "./metadata-headers.js";

export default (client: AwsClient, pluginOptions: PluginOptions) => {
	const getMetadata: MediaAdapterServiceGetMeta = async (key) => {
		try {
			const response = await client.sign(
				new Request(
					`${pluginOptions.endpoint}/${pluginOptions.bucket}/${key}`,
					{
						method: "HEAD",
					},
				),
			);

			const result = await fetch(response);

			if (!result.ok) {
				return {
					error: {
						type: "plugin",
						message: serverText("plugin.s3.objects.metadata.fetch.failed", {
							data: {
								status: result.status,
								statusText: result.statusText,
							},
						}),
					},
					data: undefined,
				};
			}

			const contentLength =
				parseStoredSize(result.headers.get("content-length")) ??
				parseStoredSize(result.headers.get(METADATA_SIZE_HEADER));

			if (contentLength === null) {
				return {
					error: {
						message: serverText("plugin.s3.objects.metadata.missing"),
					},
					data: undefined,
				};
			}

			const contentType = result.headers.get("content-type");
			const etag = result.headers.get("etag");

			return {
				error: undefined,
				data: {
					size: contentLength,
					mimeType: contentType || null,
					etag: etag || null,
				},
			};
		} catch (e) {
			return {
				error: {
					type: "plugin",
					message: serverText("plugin.s3.errors.unknown", {
						fallback: e instanceof Error ? e.message : undefined,
					}),
				},
				data: undefined,
			};
		}
	};
	return getMetadata;
};
