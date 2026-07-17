import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "./client.js";

describe("@lucidcms/client", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	test("serializes document queries and returns single document response bodies", async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(
				JSON.stringify({
					data: {
						id: 1,
						collectionKey: "page",
						version: "latest",
						fields: {},
						bricks: [],
						refs: {},
						meta: {
							versionId: 1,
							versions: {
								latest: null,
							},
							createdBy: null,
							createdAt: null,
							updatedAt: null,
							updatedBy: null,
						},
					},
					meta: {
						links: [],
						path: "https://example.com/lucid/api/v1/client/document/page",
						currentPage: null,
						lastPage: null,
						perPage: null,
						total: null,
					},
				}),
				{
					status: 200,
					headers: {
						"content-type": "application/json",
					},
				},
			),
		);

		const client = createClient({
			baseUrl: "https://example.com",
			apiKey: "client-key",
			fetch: fetchMock,
		});

		const response = await client.documents.getSingle({
			collectionKey: "page",
			version: "latest",
			preview: "a".repeat(43),
			query: {
				filter: {
					_fullSlug: {
						value: "/about",
						operator: "starts-with",
					},
					banner: {
						_title: {
							value: "About us",
						},
					},
					fields: {
						sections: {
							_section_title: {
								value: "Hero",
							},
						},
					},
				},
				include: ["bricks", "refs.relation", "meta"],
			},
		});

		expect(response.error).toBeUndefined();
		expect(response.data?.data.id).toBe(1);
		expect(response.data?.meta.path).toBe(
			"https://example.com/lucid/api/v1/client/document/page",
		);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		const [url, init] = fetchMock.mock.calls[0] ?? [];
		expect(String(url)).toContain(
			"/document/page?filter%5B_fullSlug%3Astarts-with%5D=%2Fabout&filter%5Bbanner._title%5D=About+us&filter%5Bfields.sections._section_title%5D=Hero&include=bricks%2Crefs.relation%2Cmeta",
		);
		expect(new URL(String(url)).searchParams.get("preview")).toBe(
			"a".repeat(43),
		);
		expect(new URL(String(url)).searchParams.get("version")).toBe("latest");
		expect(new URL(String(url)).searchParams.has("versionId")).toBe(false);
		expect(new Headers(init?.headers).get("authorization")).toBe("client-key");
	});

	test("resolves preview metadata for browser applications", async () => {
		const token = "a".repeat(43);
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(
				JSON.stringify({
					data: {
						mode: "scoped",
						entry: {
							collectionKey: "page",
							documentId: 42,
							version: "revision",
							versionId: 7,
						},
						expiresAt: "2099-01-01T00:00:00.000Z",
					},
					meta: {
						links: [],
						path: `https://example.com/lucid/api/v1/client/preview/${token}`,
						currentPage: null,
						lastPage: null,
						perPage: null,
						total: null,
					},
				}),
				{
					status: 200,
					headers: { "content-type": "application/json" },
				},
			),
		);
		const client = createClient({
			baseUrl: "https://example.com",
			apiKey: "client-key",
			fetch: fetchMock,
		});

		const response = await client.previews.resolve({ token });

		expect(response.error).toBeUndefined();
		expect(response.data?.data).toMatchObject({
			mode: "scoped",
			entry: {
				collectionKey: "page",
				documentId: 42,
				version: "revision",
				versionId: 7,
			},
		});
		const [url, init] = fetchMock.mock.calls[0] ?? [];
		expect(String(url)).toBe(
			`https://example.com/lucid/api/v1/client/preview/${token}`,
		);
		expect(new Headers(init?.headers).get("authorization")).toBe("client-key");
	});

	test("retries idempotent GET requests and returns paginated response bodies", async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						name: "Busy",
						message: "Try again",
						status: 503,
					}),
					{
						status: 503,
						headers: {
							"content-type": "application/json",
						},
					},
				),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						data: [],
						meta: {
							links: [],
							path: "https://example.com/lucid/api/v1/client/documents/page",
							currentPage: 1,
							lastPage: 1,
							perPage: 10,
							total: 0,
						},
					}),
					{
						status: 200,
						headers: {
							"content-type": "application/json",
						},
					},
				),
			);

		const client = createClient({
			baseUrl: "https://example.com",
			apiKey: "client-key",
			fetch: fetchMock,
			retry: {
				attempts: 1,
				baseDelayMs: 1,
				maxDelayMs: 1,
			},
		});

		const response = await client.documents.getMultiple({
			collectionKey: "page",
			version: "latest",
			query: {
				include: ["refs.relation", "meta"],
				sort: [
					{ key: "updatedAt", direction: "asc" },
					{ key: "_pageTitle", direction: "desc" },
				],
			},
		});

		expect(response.error).toBeUndefined();
		expect(response.data?.data).toEqual([]);
		expect(response.data?.meta.total).toBe(0);
		expect(response.data).toEqual({
			data: [],
			meta: {
				links: [],
				path: "https://example.com/lucid/api/v1/client/documents/page",
				currentPage: 1,
				lastPage: 1,
				perPage: 10,
				total: 0,
			},
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
		const firstRequestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
		const secondRequestUrl = new URL(String(fetchMock.mock.calls[1]?.[0]));
		expect(firstRequestUrl.pathname).toBe(
			"/lucid/api/v1/client/documents/page",
		);
		expect(firstRequestUrl.searchParams.get("version")).toBe("latest");
		expect(firstRequestUrl.searchParams.get("include")).toBe(
			"refs.relation,meta",
		);
		expect(firstRequestUrl.searchParams.get("sort")).toBe(
			"updatedAt,-_pageTitle",
		);
		expect(secondRequestUrl.searchParams.get("include")).toBe(
			"refs.relation,meta",
		);
		expect(secondRequestUrl.searchParams.get("sort")).toBe(
			"updatedAt,-_pageTitle",
		);
	});

	test("does not retry POST requests by default", async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(
				JSON.stringify({
					name: "Busy",
					message: "Try again",
					status: 503,
				}),
				{
					status: 503,
					headers: {
						"content-type": "application/json",
					},
				},
			),
		);

		const client = createClient({
			baseUrl: "https://example.com",
			apiKey: "client-key",
			fetch: fetchMock,
			retry: {
				attempts: 2,
				baseDelayMs: 1,
				maxDelayMs: 1,
			},
		});

		const response = await client.media.process({
			key: "public/example.png",
		});

		expect(response.error?.kind).toBe("http");
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	test("runs middleware hooks for request, response, and errors", async () => {
		const requestOrder: string[] = [];
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(
				JSON.stringify({
					name: "Forbidden",
					message: "Nope",
					status: 403,
				}),
				{
					status: 403,
					headers: {
						"content-type": "application/json",
					},
				},
			),
		);

		const client = createClient({
			baseUrl: "https://example.com",
			apiKey: "client-key",
			fetch: fetchMock,
			middleware: [
				{
					onRequest: ({ init }) => {
						requestOrder.push("request");
						return {
							init: {
								...init,
								headers: new Headers({
									...Object.fromEntries(new Headers(init.headers).entries()),
									"x-client-test": "1",
								}),
							},
						};
					},
					onResponse: () => {
						requestOrder.push("response");
					},
					onError: ({ error }) => {
						requestOrder.push("error");
						return {
							...error,
							message: "Middleware changed the error message.",
						};
					},
				},
			],
		});

		const response = await client.locales.getAll();

		expect(response.error?.message).toBe(
			"Middleware changed the error message.",
		);
		expect(requestOrder).toEqual(["request", "response", "error"]);

		const [, init] = fetchMock.mock.calls[0] ?? [];
		expect(new Headers(init?.headers).get("x-client-test")).toBe("1");
	});

	test("returns timeout errors as values", async () => {
		const fetchMock = vi.fn<typeof fetch>(
			async (_input, init) =>
				await new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener("abort", () => {
						reject(new DOMException("Timed out", "AbortError"));
					});
				}),
		);

		const client = createClient({
			baseUrl: "https://example.com",
			apiKey: "client-key",
			fetch: fetchMock,
			timeoutMs: 5,
		});

		const response = await client.locales.getAll();

		expect(response.error?.kind).toBe("timeout");
		expect(response.data).toBeUndefined();
	});

	test("accepts an AbortController and returns abort errors as values", async () => {
		const fetchMock = vi.fn<typeof fetch>(
			async (_input, init) =>
				await new Promise<Response>((_resolve, reject) => {
					if (init?.signal?.aborted) {
						reject(new DOMException("Aborted", "AbortError"));
						return;
					}

					init?.signal?.addEventListener("abort", () => {
						reject(new DOMException("Aborted", "AbortError"));
					});
				}),
		);

		const client = createClient({
			baseUrl: "https://example.com",
			apiKey: "client-key",
			fetch: fetchMock,
		});

		const abortController = new AbortController();
		const responsePromise = client.locales.getAll({
			request: {
				abortController,
			},
		});

		abortController.abort();

		const response = await responsePromise;

		expect(response.error?.kind).toBe("abort");
		expect(response.data).toBeUndefined();
	});

	test("accepts a full client endpoint base URL without duplicating the client path", async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(
				JSON.stringify({
					data: [],
					meta: {
						links: [],
						path: "https://example.com/lucid/api/v1/client/locales",
						currentPage: null,
						lastPage: null,
						perPage: null,
						total: null,
					},
				}),
				{
					status: 200,
					headers: {
						"content-type": "application/json",
					},
				},
			),
		);

		const client = createClient({
			baseUrl: "https://example.com/lucid/api/v1/client",
			apiKey: "client-key",
			fetch: fetchMock,
		});

		const response = await client.locales.getAll();

		expect(response.error).toBeUndefined();
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
			"https://example.com/lucid/api/v1/client/locales",
		);
	});
});
