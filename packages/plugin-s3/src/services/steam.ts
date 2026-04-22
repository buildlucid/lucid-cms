import type { Readable } from "node:stream";
import type { MediaAdapterServiceStream } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import T from "../translations/index.js";
import type { PluginOptions } from "../types/types.js";

export default (client: AwsClient, pluginOptions: PluginOptions) => {
	const stream: MediaAdapterServiceStream = async (
		key: string,
		options?: {
			ifNoneMatch?: string;
			range?: {
				start: number;
				end?: number;
			};
		},
	) => {
		try {
			const headers: Record<string, string> = {};

			if (options?.range) {
				const start = options.range.start;
				const end = options.range.end;
				headers.Range =
					end !== undefined ? `bytes=${start}-${end}` : `bytes=${start}-`;
			}

			if (options?.ifNoneMatch) {
				headers["If-None-Match"] = options.ifNoneMatch;
			}

			const response = await client.sign(
				new Request(
					`${pluginOptions.endpoint}/${pluginOptions.bucket}/${key}`,
					{
						method: "GET",
						headers,
					},
				),
			);

			const result = await fetch(response);

			if (result.status === 304) {
				return {
					error: undefined,
					data: {
						contentLength: undefined,
						contentType: undefined,
						body: new Uint8Array(),
						etag: result.headers.get("etag"),
						notModified: true,
					},
				};
			}

			if (!result.ok) {
				return {
					error: {
						message: T("stream_failed", {
							status: result.status,
							statusText: result.statusText,
						}),
					},
					data: undefined,
				};
			}

			if (!result.body) {
				return {
					error: {
						message: T("object_body_undefined"),
					},
					data: undefined,
				};
			}

			let isPartialContent = false;
			let totalSize: number | undefined;
			let range: { start: number; end: number } | undefined;

			const contentRange = result.headers.get("content-range");
			if (contentRange) {
				isPartialContent = true;
				const match = contentRange.match(/bytes (\d+)-(\d+)\/(\d+)/);
				if (match?.[1] && match[2] && match[3]) {
					range = {
						start: Number.parseInt(match[1], 10),
						end: Number.parseInt(match[2], 10),
					};
					totalSize = Number.parseInt(match[3], 10);
				}
			}

			const contentLength = result.headers.get("content-length");
			const contentType = result.headers.get("content-type");
			const etag = result.headers.get("etag");

			return {
				error: undefined,
				data: {
					contentLength: contentLength
						? Number.parseInt(contentLength, 10)
						: undefined,
					contentType: contentType || undefined,
					body: result.body as unknown as Readable,
					etag: etag || null,
					isPartialContent,
					totalSize:
						totalSize ||
						(contentLength ? Number.parseInt(contentLength, 10) : undefined),
					range,
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

	return stream;
};
