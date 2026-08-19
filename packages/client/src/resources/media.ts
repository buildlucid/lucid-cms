import type {
	Media,
	MediaResolveUrlOptions,
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

export type MediaResolveUrlInput = MediaResolveUrlOptions & {
	key: string;
	request?: LucidRequestOptions;
};

export type MediaResolveUrlResponse = ResponseBody<MediaUrl>;

export interface LucidMediaClient {
	/** Fetches one media item by id. */
	getSingle(
		input: MediaGetSingleInput,
	): Promise<LucidClientResponse<MediaGetSingleResponse>>;

	/** Fetches a paginated list of media items. */
	getMultiple(
		input?: MediaGetMultipleInput,
	): Promise<LucidClientResponse<MediaGetMultipleResponse>>;

	/** Resolves a media key to a URL with optional image transformations. */
	resolveUrl(
		input: MediaResolveUrlInput,
	): Promise<LucidClientResponse<MediaResolveUrlResponse>>;
}

/** Creates the media resource used by the public Lucid client. */
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
	resolveUrl: async (input) =>
		await transport.request<MediaResolveUrlResponse>({
			operation: "media.resolveUrl",
			method: "POST",
			path: `/media/resolve/${encodePathPreservingSlashes(input.key)}`,
			body: {
				preset: input.preset,
				format: input.format,
			},
			request: input.request,
		}),
});
