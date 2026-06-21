import { Readable } from "node:stream";
import { copy } from "@lucidcms/core/plugin";
import type {
	MediaAdapterServiceUploadSingle,
	ServiceContext,
} from "@lucidcms/core/types";
import type { PluginOptions } from "../types.js";
import { resolveBinding } from "../utils/resolve-binding.js";

type UploadSingleProps = Parameters<MediaAdapterServiceUploadSingle>[1];

/**
 * Centralizes writes to the R2 binding so direct adapter uploads and the
 * plugin-owned upload route apply the same metadata rules.
 */
export const putObject = async (
	pluginOptions: PluginOptions,
	context: ServiceContext,
	props: UploadSingleProps,
) => {
	const binding = resolveBinding(context, pluginOptions);
	const body =
		props.body instanceof Readable
			? (Readable.toWeb(props.body) as unknown as ReadableStream)
			: props.body;

	return await binding.put(props.key, body, {
		httpMetadata: {
			...pluginOptions.upload?.httpMetadata,
			contentType: props.mimeType,
		},
		customMetadata: {
			...(pluginOptions.upload?.customMetadata ?? {}),
			extension: props.extension,
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
	return async (context, props) => {
		try {
			const object = await putObject(options, context, props);

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
