import { copy } from "@lucidcms/core/plugin";
import type { MediaAdapterServiceGetMeta } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import type { PluginOptions } from "../types/types.js";
import {
	METADATA_SIZE_HEADER,
	parseStoredSize,
} from "../utils/metadata-headers.js";

export default (client: AwsClient, pluginOptions: PluginOptions) => {
	const getMetadata: MediaAdapterServiceGetMeta = async (_context, { key }) => {
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
						message: copy("server:plugin.s3.objects.metadata.fetch.failed", {
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
						message: copy("server:plugin.s3.objects.metadata.missing"),
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
					message:
						e instanceof Error
							? copy.literal(e.message)
							: copy("server:plugin.s3.errors.unknown"),
				},
				data: undefined,
			};
		}
	};
	return getMetadata;
};
