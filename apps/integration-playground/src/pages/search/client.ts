import { z } from "zod";

const responseSchema = z.object({
	data: z.array(
		z.discriminatedUnion("kind", [
			z.object({
				kind: z.literal("page"),
				id: z.string(),
				title: z.string().optional(),
				path: z.string().optional(),
				documentId: z.number().int(),
				locale: z.enum(["en", "fr"]),
			}),
			z.object({
				kind: z.literal("media"),
				id: z.string(),
				title: z.string().nullish(),
				url: z.url(),
				mediaId: z.number().int(),
				mediaType: z.string(),
				locale: z.enum(["en", "fr"]),
			}),
		]),
	),
	meta: z.object({
		total: z.number().int().nonnegative(),
		currentPage: z.number().int().positive(),
		lastPage: z.number().int().nonnegative(),
	}),
});

export type SearchResults = z.infer<typeof responseSchema>;
export type SearchQuery = {
	query: string;
	locale: string;
	page: number;
	source: "pages" | "media";
};
export type SearchAuth =
	| { type: "api-key"; key: string }
	| { type: "oauth"; accessToken: string };

/** Calls the Lucid route; the Typesense client and its credentials stay on the server. */
export const searchContent = async (options: {
	origin: string;
	auth: SearchAuth;
	query: SearchQuery;
	signal: AbortSignal;
}) => {
	const url = new URL(
		options.query.source === "media"
			? "/lucid/api/v1/content/search/media"
			: "/lucid/api/v1/content/search",
		options.origin,
	);
	url.search = new URLSearchParams({
		query: options.query.query,
		locale: options.query.locale,
		page: String(options.query.page),
		perPage: "10",
	}).toString();
	const response = await fetch(url, {
		headers: {
			Accept: "application/json",
			Authorization:
				options.auth.type === "api-key"
					? `ApiKey ${options.auth.key}`
					: `Bearer ${options.auth.accessToken}`,
		},
		credentials: "omit",
		signal: options.signal,
	});
	if (!response.ok) {
		if (response.status === 401)
			throw new Error(
				"The credential was not accepted. Check the integration key or refresh your OAuth session.",
			);
		if (response.status === 403)
			throw new Error(
				options.query.source === "media"
					? "This credential needs permission to read media."
					: "This credential needs permission to read the page collection.",
			);
		if (response.status === 503)
			throw new Error(
				"Search is unavailable. Check the Typesense connection and indexing status in Lucid.",
			);
		throw new Error(
			`Search returned HTTP ${response.status}. Check that this instance has the search route configured.`,
		);
	}
	const body: unknown = await response.json();
	const parsed = responseSchema.safeParse(body);
	if (!parsed.success)
		throw new Error("The search route returned an unexpected response.");
	return { results: parsed.data, body };
};
