import type { ServiceFn } from "../../../../utils/services/types.js";
import { copy } from "../../../i18n/index.js";
import { getLucidRemoteClient } from "../../client.js";
import { lucidRemotePaths } from "../../constants.js";

export type GeneratedMedia = {
	body: ReadableStream<Uint8Array>;
	contentType: string;
	contentLength: number | undefined;
	/** Set when only part of the file was returned, for a range request. */
	contentRange?: string;
	/** Validators for conditional and range requests, when Lucid sends them. */
	eTag?: string;
	lastModified?: string;
};

/** Streams a generated file using its connection token, optionally requesting a byte range. */
const getGeneratedMedia: ServiceFn<
	[
		{
			accessToken: string;
			storageKey: string;
			range?: string;
			signal?: AbortSignal;
		},
	],
	GeneratedMedia
> = async (context, props) => {
	const response = await getLucidRemoteClient(context).stream(
		`${lucidRemotePaths.getCmsAiMedia}/${encodeURIComponent(props.storageKey)}`,
		{
			accessToken: props.accessToken,
			range: props.range,
			signal: props.signal,
		},
	);
	if (response.error) return response;

	const { body, headers } = response.data;
	if (!body) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 502,
				message: copy("server:core.ai.remote.generation.not.found.message"),
			},
		};
	}

	const length = Number(headers.get("content-length"));
	return {
		error: undefined,
		data: {
			body,
			contentType: headers.get("content-type") ?? "application/octet-stream",
			contentLength: Number.isFinite(length) && length > 0 ? length : undefined,
			contentRange:
				response.data.status === 206
					? (headers.get("content-range") ?? undefined)
					: undefined,
			eTag: headers.get("etag") ?? undefined,
			lastModified: headers.get("last-modified") ?? undefined,
		},
	};
};

export default getGeneratedMedia;
