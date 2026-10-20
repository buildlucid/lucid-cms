import type {
	ContentLocaleInput,
	ContentMedia,
	IsLocalized,
	Media,
	MediaListItem,
	MediaResolveUrlOptions,
	MediaUrl,
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

export type MediaGetSingleInput<
	TLocale extends string | undefined = undefined,
> = {
	id: number;
	/** The locale empty text falls back to, such as the default locale. */
	fallbackLocale?: string;
	request?: LucidRequestOptions;
} & ContentLocaleInput<TLocale>;

export type MediaGetMultipleInput<
	TLocale extends string | undefined = undefined,
> = {
	query?: MediaGetMultipleQuery;
	/** The locale empty text falls back to, such as the default locale. */
	fallbackLocale?: string;
	request?: LucidRequestOptions;
} & ContentLocaleInput<TLocale>;

export type MediaGetSingleResponse<
	TLocale extends string | undefined = undefined,
> = LucidClientResponse<ContentMedia<Media, IsLocalized<TLocale>>>;

/** List items leave out audio transcripts unless the query includes `transcripts`. */
export type MediaGetMultipleResponse<
	TLocale extends string | undefined = undefined,
> = LucidClientResponse<ContentMedia<MediaListItem, IsLocalized<TLocale>>[]>;

export type MediaResolveUrlInput = MediaResolveUrlOptions & {
	key: string;
	request?: LucidRequestOptions;
};

export type MediaResolveUrlResponse = LucidClientResponse<MediaUrl>;

export interface LucidMediaClient {
	/** Fetches one media item by id. */
	getSingle<TLocale extends string | undefined = undefined>(
		input: MediaGetSingleInput<TLocale>,
	): Promise<MediaGetSingleResponse<TLocale>>;

	/** Fetches a paginated list of media items. */
	getMultiple<TLocale extends string | undefined = undefined>(
		input?: MediaGetMultipleInput<TLocale>,
	): Promise<MediaGetMultipleResponse<TLocale>>;

	/** Resolves a media key to a URL with optional image transformations. */
	resolveUrl(input: MediaResolveUrlInput): Promise<MediaResolveUrlResponse>;
}

/** Creates the media resource used by the public Lucid client. */
export const createMediaClient = (
	transport: LucidTransport,
): LucidMediaClient => ({
	getSingle: async <TLocale extends string | undefined = undefined>(
		input: MediaGetSingleInput<TLocale>,
	) =>
		await transport.request<ContentMedia<Media, IsLocalized<TLocale>>>({
			operation: "media.getSingle",
			method: "GET",
			path: `/media/${encodePathSegment(String(input.id))}`,
			query: { locale: input.locale, fallbackLocale: input.fallbackLocale },
			request: input.request,
		}),
	getMultiple: async <TLocale extends string | undefined = undefined>(
		input: MediaGetMultipleInput<TLocale> = {},
	) =>
		await transport.request<
			ContentMedia<MediaListItem, IsLocalized<TLocale>>[]
		>({
			operation: "media.getMultiple",
			method: "GET",
			path: "/media",
			query: {
				...input.query,
				locale: input.locale,
				fallbackLocale: input.fallbackLocale,
			},
			request: input.request,
		}),
	resolveUrl: async (input) =>
		await transport.request<MediaUrl>({
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
