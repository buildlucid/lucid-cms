import type {
	Media,
	MediaProcessOptions,
	MediaUrl,
	ResponseBody,
} from "@lucidcms/types";
import type { MediaGetMultipleQuery } from "../types/contracts.js";
import type { LucidClientResponse } from "../types/errors.js";
import type {
	LucidRequestOptions,
	LucidTransport,
} from "../types/transport.js";
import {
	encodePathPreservingSlashes,
	encodePathSegment,
} from "../utils/url.js";

export type MediaGetSingleInput = {
	id: number;
	request?: LucidRequestOptions;
};

export type MediaGetMultipleInput = {
	query?: MediaGetMultipleQuery;
	request?: LucidRequestOptions;
};

export type MediaGetSingleResponse = ResponseBody<Media>;

export type MediaGetMultipleResponse = ResponseBody<Media[]>;

export type MediaProcessInput = {
	key: string;
	body?: MediaProcessOptions;
	request?: LucidRequestOptions;
};

export type MediaProcessResponse = ResponseBody<MediaUrl>;

export interface LucidMediaClient {
	/** Returns the Lucid response body for one media item. */
	getSingle(
		input: MediaGetSingleInput,
	): Promise<LucidClientResponse<MediaGetSingleResponse>>;

	/** Returns the Lucid response body for a paginated media list. */
	getMultiple(
		input?: MediaGetMultipleInput,
	): Promise<LucidClientResponse<MediaGetMultipleResponse>>;

	/** Returns the Lucid response body containing the processed media URL. */
	process(
		input: MediaProcessInput,
	): Promise<LucidClientResponse<MediaProcessResponse>>;
}

/**
 * Creates the internal media resource wrapper so media paths and request typing stay isolated here.
 */
export const createMediaClient = (
	transport: LucidTransport,
): LucidMediaClient => ({
	getSingle: async (input) =>
		await transport.request<MediaGetSingleResponse>({
			operation: "media.getSingle",
			method: "GET",
			path: `/media/${encodePathSegment(String(input.id))}`,
			request: input.request,
		}),
	getMultiple: async (input = {}) =>
		await transport.request<MediaGetMultipleResponse>({
			operation: "media.getMultiple",
			method: "GET",
			path: "/media",
			query: input.query,
			request: input.request,
		}),
	process: async (input) =>
		await transport.request<MediaProcessResponse>({
			operation: "media.process",
			method: "POST",
			path: `/media/process/${encodePathPreservingSlashes(input.key)}`,
			body: input.body,
			request: input.request,
		}),
});
