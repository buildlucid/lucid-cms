import { Readable } from "node:stream";
import type { MediaAdapterServiceUploadSingle } from "@lucidcms/core/types";
import T from "../translations/index.js";
import type { PluginOptions } from "../types.js";

type UploadSingleProps = Parameters<MediaAdapterServiceUploadSingle>[0];

/**
 * Centralizes writes to the R2 binding so direct adapter uploads and the
 * plugin-owned upload route apply the same metadata rules.
 */
export const putObject = async (
	pluginOptions: PluginOptions,
	props: UploadSingleProps,
) => {
	const body =
		props.data instanceof Readable
			? (Readable.toWeb(props.data) as unknown as ReadableStream)
			: props.data;

	return await pluginOptions.binding.put(props.key, body, {
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
	pluginOptions: PluginOptions,
): MediaAdapterServiceUploadSingle => {
	return async (props) => {
		try {
			const object = await putObject(pluginOptions, props);

			return {
				error: undefined,
				data: {
					etag: object.etag,
				},
			};
		} catch (error) {
			return {
				error: {
					type: "plugin",
					message:
						error instanceof Error
							? error.message
							: T("an_unknown_error_occurred"),
				},
				data: undefined,
			};
		}
	};
};

export default uploadSingle;
