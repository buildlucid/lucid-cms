import { copy, LucidError } from "@lucidcms/core";
import { toWebReadable } from "@lucidcms/core/extension";
import type { MediaStorageAdapterServiceUploadSingle } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import type { PluginOptions } from "../types/types.js";
import { applyMetadataHeaders } from "../utils/metadata-headers.js";

export default (client: AwsClient, pluginOptions: PluginOptions) => {
	const uploadSingle: MediaStorageAdapterServiceUploadSingle = async (
		_context,
		props,
	) => {
		try {
			const headers = new Headers();

			applyMetadataHeaders(headers, props);
			headers.set("X-Amz-Content-Sha256", "UNSIGNED-PAYLOAD");
			headers.set("Content-Length", String(props.size));

			const body =
				props.body instanceof Uint8Array
					? new Uint8Array(props.body)
					: toWebReadable(props.body);

			const response = await client.sign(
				`${pluginOptions.endpoint}/${pluginOptions.bucket}/${props.key}`,
				{ method: "PUT", body, headers },
			);

			const result = await fetch(response);

			if (!result.ok) {
				throw new LucidError({
					type: "plugin",
					message: copy("server:plugin.s3.objects.upload.failed", {
						data: {
							status: result.status,
							statusText: result.statusText,
						},
					}),
				});
			}

			const etag = result.headers.get("etag")?.replace(/"/g, "");

			return { etag };
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

	return uploadSingle;
};
