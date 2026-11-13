import type { LucidClientResponse } from "../types/errors.js";
import type {
	LucidRequestOptions,
	LucidResponseType,
	LucidTransport,
} from "../types/transport.js";

/** A query value. Lists are sent comma-separated, null as an empty value, and undefined is left out. */
export type RoutesQueryValue =
	| string
	| number
	| boolean
	| null
	| undefined
	| ReadonlyArray<string | number | boolean>;

export type RoutesRequestInput<
	TResponseType extends LucidResponseType = "json",
> = {
	/** The path the route was defined with, relative to `/api/v1/content/e`. Encode dynamic segments with `encodeURIComponent`. */
	path: `/${string}`;
	/** `filter` and `sort` are left out because the client writes them in the document list syntax. */
	query?: Record<string, RoutesQueryValue> & { filter?: never; sort?: never };
	/** `json` reads Lucid's `{ data }` envelope, as `formatAPIResponse` builds it. `text` returns the body as a string, such as XML. Defaults to `json`. */
	responseType?: TResponseType;
	request?: LucidRequestOptions;
} & (
	| { method?: "GET"; body?: never }
	| {
			method: "POST";
			/** Sent as JSON. */
			body?: unknown;
	  }
);

/** The route's data, typed by the caller for JSON, or a string for text. */
export type RoutesRequestResponse<
	TData = unknown,
	TResponseType extends LucidResponseType = "json",
> = LucidClientResponse<TResponseType extends "text" ? string : TData>;

export interface LucidRoutesClient {
	/**
	 * Calls a route that a plugin or project added with `defineContentApiRoute`. Pass the data type a
	 * JSON route returns; text responses are strings.
	 *
	 * @example
	 * ```ts
	 * const hits = await client.routes.request<SearchHit[]>({
	 * 	path: "/search",
	 * 	query: { term: "lucid", perPage: 10 },
	 * });
	 * const feed = await client.routes.request({
	 * 	path: "/feed.xml",
	 * 	responseType: "text",
	 * });
	 * ```
	 */
	request<TData = unknown, TResponseType extends LucidResponseType = "json">(
		input: RoutesRequestInput<TResponseType>,
	): Promise<RoutesRequestResponse<TData, TResponseType>>;
}

/** Creates the custom routes resource used by the public Lucid client. */
export const createRoutesClient = (
	transport: LucidTransport,
): LucidRoutesClient => ({
	request: async <
		TData = unknown,
		TResponseType extends LucidResponseType = "json",
	>(
		input: RoutesRequestInput<TResponseType>,
	) =>
		await transport.request<TResponseType extends "text" ? string : TData>({
			operation: "routes.request",
			method: input.method ?? "GET",
			//* matches core, which serves a route defined at "/" on the prefix itself
			path: input.path === "/" ? "/e" : `/e${input.path}`,
			query: input.query,
			body: input.body,
			responseType: input.responseType,
			request: input.request,
		}),
});
