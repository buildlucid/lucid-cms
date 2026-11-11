import { copy, LucidError } from "@lucidcms/core";
import type { MediaStorageAdapterServiceGetMeta } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import type { PluginOptions } from "../types/types.js";
import {
	METADATA_SIZE_HEADER,
	parseStoredSize,
} from "../utils/metadata-headers.js";

export default (client: AwsClient, pluginOptions: PluginOptions) => {
	const getMetadata: MediaStorageAdapterServiceGetMeta = async (
		_context,
		{ key },
	) => {
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
				throw new LucidError({
					//* a missing object or a range past its end is the caller's to handle, not a failure
					status:
						result.status === 404 || result.status === 416
							? result.status
							: undefined,
					type: "plugin",
					message: copy("server:plugin.s3.objects.metadata.fetch.failed", {
						data: {
							status: result.status,
							statusText: result.statusText,
						},
					}),
				});
			}

			const contentLength =
				parseStoredSize(result.headers.get("content-length")) ??
				parseStoredSize(result.headers.get(METADATA_SIZE_HEADER));

			if (contentLength === null) {
				throw new LucidError({
					message: copy("server:plugin.s3.objects.metadata.missing"),
				});
			}

			const contentType = result.headers.get("content-type");
			const etag = result.headers.get("etag");

			return {
				size: contentLength,
				mimeType: contentType || null,
				etag: etag || null,
				status: "ready",
			};
		} catch (e) {
			if (e instanceof LucidError) throw e;
			throw new LucidError({
				type: "plugin",
				message:
					e instanceof Error
						? copy.literal(e.message)
						: copy("server:plugin.s3.errors.unknown"),
			});
		}
	};
	return getMetadata;
};
