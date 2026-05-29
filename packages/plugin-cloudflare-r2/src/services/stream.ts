import { copy } from "@lucidcms/core/plugin";
import type { MediaAdapterServiceStream } from "@lucidcms/core/types";
import type { PluginOptions } from "../types.js";

const stream = (pluginOptions: PluginOptions): MediaAdapterServiceStream => {
	return async (key, options) => {
		try {
			if (!options?.range) {
				if (options?.ifNoneMatch) {
					const object = await pluginOptions.binding.get(key, {
						onlyIf: new Headers({
							"If-None-Match": options.ifNoneMatch,
						}),
					});

					if (!object) {
						return {
							error: {
								type: "plugin",
								message: copy("server:plugin.cloudflare.r2.objects.not.found"),
							},
							data: undefined,
						};
					}

					if (!("body" in object)) {
						return {
							error: undefined,
							data: {
								contentLength: undefined,
								contentType: object.httpMetadata?.contentType,
								body: new Uint8Array(),
								etag: object.etag || null,
								notModified: true,
							},
						};
					}

					return {
						error: undefined,
						data: {
							contentLength: object.size,
							contentType: object.httpMetadata?.contentType,
							body: object.body,
							etag: object.etag || null,
						},
					};
				}

				const object = await pluginOptions.binding.get(key);

				if (!object) {
					return {
						error: {
							type: "plugin",
							message: copy("server:plugin.cloudflare.r2.objects.not.found"),
						},
						data: undefined,
					};
				}

				return {
					error: undefined,
					data: {
						contentLength: object.size,
						contentType: object.httpMetadata?.contentType,
						body: object.body,
						etag: object.etag || null,
					},
				};
			}

			const meta = await pluginOptions.binding.head(key);
			if (!meta) {
				return {
					error: {
						type: "plugin",
						message: copy("server:plugin.cloudflare.r2.objects.not.found"),
					},
					data: undefined,
				};
			}

			const start = options.range.start;
			const end = options.range.end ?? meta.size - 1;

			const object = await pluginOptions.binding.get(key, {
				range: {
					offset: start,
					length: end - start + 1,
				},
			});

			if (!object) {
				return {
					error: {
						type: "plugin",
						message: copy("server:plugin.cloudflare.r2.objects.not.found"),
					},
					data: undefined,
				};
			}

			return {
				error: undefined,
				data: {
					contentLength: end - start + 1,
					contentType: object.httpMetadata?.contentType,
					body: object.body,
					etag: object.etag || meta.etag || null,
					isPartialContent: true,
					totalSize: meta.size,
					range: {
						start,
						end,
					},
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

export default stream;
