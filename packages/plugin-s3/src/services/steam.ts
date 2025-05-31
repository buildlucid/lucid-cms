import T from "../translations/index.js";
import { type S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";
import type { PluginOptions } from "../types/types.js";
import type { MediaStrategyStream } from "@lucidcms/core/types";

export default (client: S3Client, pluginOptions: PluginOptions) => {
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
			const commandParams: {
				Bucket: string;
				Key: string;
				Range?: string;
			} = {
				Bucket: pluginOptions.bucket,
				Key: key,
			};

			//* add Range header if range is specified
			if (options?.range) {
				const start = options.range.start;
				const end = options.range.end;
				commandParams.Range =
					end !== undefined ? `bytes=${start}-${end}` : `bytes=${start}-`;
			}

			const command = new GetObjectCommand(commandParams);
			const response = await client.send(command);

			if (response.Body === undefined) {
				return {
					error: {
						message: T("object_body_undefined"),
					},
					data: undefined,
				};
			}

			//* parse range information from response
			let isPartialContent = false;
			let totalSize: number | undefined;
			let range: { start: number; end: number } | undefined;

			if (response.ContentRange) {
				isPartialContent = true;
				//* Content-Range format: "bytes start-end/total"
				const match = response.ContentRange.match(/bytes (\d+)-(\d+)\/(\d+)/);
				if (match?.[1] && match[2] && match[3]) {
					range = {
						start: Number.parseInt(match[1], 10),
						end: Number.parseInt(match[2], 10),
					};
					totalSize = Number.parseInt(match[3], 10);
				}
			}

			return {
				error: undefined,
				data: {
					contentLength: response.ContentLength,
					contentType: response.ContentType,
					body: response.Body as Readable,
					isPartialContent,
					totalSize: totalSize || response.ContentLength,
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
