import T from "../translations/index.js";
import type { AwsClient } from "aws4fetch";
import { Readable } from "node:stream";
import type { PluginOptions } from "../types/types.js";
import type { MediaStrategyStream } from "@lucidcms/core/types";

export default (client: AwsClient, pluginOptions: PluginOptions) => {
	// @ts-expect-error
	const stream: MediaStrategyStream = async (
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
				throw new Error(`Stream failed: ${result.statusText}`);
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
					body: result.body,
					isPartialContent,
					totalSize:
						totalSize ||
						(contentLength ? Number.parseInt(contentLength, 10) : undefined),
					range,
				},
			};
		} catch (e) {
			const error = e as Error;
			return {
				error: {
					message: error.message,
				},
				data: undefined,
			};
		}
	};

	return stream;
};
