import type { Readable } from "node:stream";
import type { MediaAdapterServiceStream } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import T from "../translations/index.js";
import type { PluginOptions } from "../types/types.js";

export default (client: AwsClient, pluginOptions: PluginOptions) => {
	const stream: MediaAdapterServiceStream = async (
		key: string,
		options?: {
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

			return {
				error: undefined,
				data: {
					contentLength: contentLength
						? Number.parseInt(contentLength, 10)
						: undefined,
					contentType: contentType || undefined,
					body: result.body as unknown as Readable,
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
