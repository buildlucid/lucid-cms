import { copy, LucidError } from "@lucidcms/core";
import type { MediaStorageAdapterServiceStream } from "@lucidcms/core/types";
import type { PluginOptions } from "../types.js";
import { resolveBinding } from "../utils/resolve-binding.js";

const stream = (
	pluginOptions: PluginOptions,
): MediaStorageAdapterServiceStream => {
	return async (context, { key, range, ifNoneMatch }) => {
		try {
			const binding = resolveBinding(context, pluginOptions);
			if (!range) {
				if (ifNoneMatch) {
					const object = await binding.get(key, {
						onlyIf: new Headers({
							"If-None-Match": ifNoneMatch,
						}),
					});

					if (!object) {
						throw new LucidError({
							type: "plugin",
							message: copy("server:plugin.cloudflare.r2.objects.not.found"),
						});
					}

					if (!("body" in object)) {
						return {
							contentLength: undefined,
							contentType: object.httpMetadata?.contentType,
							body: new Uint8Array(),
							etag: object.etag || null,
							notModified: true,
						};
					}

					return {
						contentLength: object.size,
						contentType: object.httpMetadata?.contentType,
						body: object.body,
						etag: object.etag || null,
					};
				}

				const object = await binding.get(key);

				if (!object) {
					throw new LucidError({
						type: "plugin",
						message: copy("server:plugin.cloudflare.r2.objects.not.found"),
					});
				}

				return {
					contentLength: object.size,
					contentType: object.httpMetadata?.contentType,
					body: object.body,
					etag: object.etag || null,
				};
			}

			const meta = await binding.head(key);
			if (!meta) {
				throw new LucidError({
					type: "plugin",
					message: copy("server:plugin.cloudflare.r2.objects.not.found"),
				});
			}

			const start = range.start;
			const end = range.end ?? meta.size - 1;

			const object = await binding.get(key, {
				range: {
					offset: start,
					length: end - start + 1,
				},
			});

			if (!object) {
				throw new LucidError({
					type: "plugin",
					message: copy("server:plugin.cloudflare.r2.objects.not.found"),
				});
			}

			return {
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
			};
		} catch (error) {
			if (error instanceof LucidError) throw error;
			throw new LucidError({
				type: "plugin",
				message:
					error instanceof Error
						? copy.literal(error.message)
						: copy("server:plugin.cloudflare.r2.errors.unknown"),
			});
		}
	};
};

export default stream;
