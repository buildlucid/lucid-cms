import { Readable } from "node:stream";
import { copy } from "@lucidcms/core/plugin";
import type { MediaAdapterServiceUploadSingle } from "@lucidcms/core/types";
import type { PluginOptions } from "../types.js";
import { resolveBinding } from "../utils/resolve-binding.js";

type UploadSingleProps = Parameters<MediaAdapterServiceUploadSingle>[0];

/**
 * Centralizes writes to the R2 binding so direct adapter uploads and the
 * plugin-owned upload route apply the same metadata rules.
 */
export const putObject = async (
	pluginOptions: PluginOptions,
	props: UploadSingleProps,
) => {
	const binding = resolveBinding(props.context, pluginOptions);
	const body =
		props.data instanceof Readable
			? (Readable.toWeb(props.data) as unknown as ReadableStream)
			: props.data;

	return await binding.put(props.key, body, {
		httpMetadata: {
			...pluginOptions.upload?.httpMetadata,
			contentType: props.meta.mimeType,
		},
		customMetadata: {
			...(pluginOptions.upload?.customMetadata ?? {}),
			extension: props.meta.extension,
		},
		storageClass: pluginOptions.upload?.storageClass,
	});
};

/**
 * Handles server-side uploads that already have the object body in-process.
 * Browser-facing uploads use the signed route path instead, but both paths
 * share `putObject()` so they stay behaviorally aligned.
 */
const uploadSingle = (
	options: PluginOptions,
): MediaAdapterServiceUploadSingle => {
	return async (props) => {
		try {
			const object = await putObject(options, props);

			return {
				error: undefined,
				data: {
					etag: object?.etag,
				},
			};
		} catch (error) {
			return {
				error: {
					type: "plugin",
					message:
						error instanceof Error
							? copy.literal(error.message)
							: copy("server:plugin.cloudflare.r2.errors.unknown"),
				},
				data: undefined,
			};
		}
	};
};

export default uploadSingle;
