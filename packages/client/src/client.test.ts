import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "./client.js";

describe("@lucidcms/client", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	test("serializes document queries and unwraps single document responses", async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(
				JSON.stringify({
					data: {
						id: 1,
						collectionKey: "page",
						version: "latest",
						fields: {},
						bricks: [],
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
					refs: {},
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
			auth: {
				type: "apiKey",
				apiKey: "client-key",
			},
			fetch: fetchMock,
		});

		const response = await client.documents.getSingle({
			collectionKey: "page",
			version: "latest",
			preview: "a".repeat(43),
			depth: 2,
			filter: {
				id: [1, 2],
				fields: {
					path: {
						value: "/about",
						operator: "starts-with",
					},
					section_title: "Hero, intro",
					parent: null,
					author: {
						people: {
							fields: {
								surname: {
									value: "Yal",
									operator: "starts-with",
								},
							},
						},
					},
				},
				bricks: {
					banner: {
						title: "About us",
					},
				},
			},
			include: ["bricks", "meta"],
		});

		expect(response.error).toBeUndefined();
		expect(response.data?.id).toBe(1);
		expect(response).not.toHaveProperty("meta");
		expect(response).not.toHaveProperty("refs");
		expect(fetchMock).toHaveBeenCalledTimes(1);

		const [url, init] = fetchMock.mock.calls[0] ?? [];
		expect(String(url)).toContain(
			"/document/page?filter%5Bid%3Ain%5D=1&filter%5Bid%3Ain%5D=2&filter%5Bfields.path%3Astarts-with%5D=%2Fabout&filter%5Bfields.section_title%5D=Hero%2C+intro&filter%5Bfields.parent%3Ais%5D=&filter%5Bfields.author.people.fields.surname%3Astarts-with%5D=Yal&filter%5Bbricks.banner.title%5D=About+us&include=bricks%2Cmeta",
		);
		expect(new URL(String(url)).searchParams.get("preview")).toBe(
			"a".repeat(43),
		);
		expect(new URL(String(url)).searchParams.get("version")).toBe("latest");
		expect(new URL(String(url)).searchParams.get("depth")).toBe("2");
		expect(new URL(String(url)).searchParams.has("versionId")).toBe(false);
		expect(new Headers(init?.headers).get("authorization")).toBe(
			"ApiKey client-key",
		);
	});

	test("resolves preview metadata for browser applications", async () => {
		const token = "a".repeat(43);
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(
				JSON.stringify({
					data: {
						mode: "scoped",
						expiresAt: "2099-01-01T00:00:00.000Z",
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
			auth: {
				type: "oauth",
				accessToken: "access-token",
			},
			fetch: fetchMock,
		});

		const response = await client.previews.resolve({ token });

		expect(response.error).toBeUndefined();
		expect(response.data).toMatchObject({
			mode: "scoped",
			expiresAt: "2099-01-01T00:00:00.000Z",
		});
		const [url, init] = fetchMock.mock.calls[0] ?? [];
		expect(String(url)).toBe("https://example.com/api/v1/content/preview");
		expect(init?.method).toBe("POST");
		expect(init?.body).toBe(JSON.stringify({ token }));
		expect(new Headers(init?.headers).get("authorization")).toBe(
			"Bearer access-token",
		);
	});

	test("retries idempotent GET requests and returns paginated response bodies", async () => {
		const accessToken = vi
			.fn<() => Promise<string>>()
			.mockResolvedValueOnce("first-access-token")
			.mockResolvedValueOnce("second-access-token");
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
						pagination: {
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
			auth: {
				type: "oauth",
				accessToken,
			},
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
			include: ["meta"],
			sort: [
				{ key: "updatedAt", direction: "asc" },
				{ key: "fields.pageTitle", direction: "desc" },
			],
			page: 1,
			perPage: 10,
		});

		expect(response.error).toBeUndefined();
		expect(response.data).toEqual({
			items: [],
			pagination: {
				currentPage: 1,
				lastPage: 1,
				perPage: 10,
				total: 0,
			},
		});
		expect(response).not.toHaveProperty("meta");
		expect(accessToken).toHaveBeenCalledTimes(2);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(
			new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("authorization"),
		).toBe("Bearer first-access-token");
		expect(
			new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("authorization"),
		).toBe("Bearer second-access-token");
		const firstRequestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
		const secondRequestUrl = new URL(String(fetchMock.mock.calls[1]?.[0]));
		expect(firstRequestUrl.pathname).toBe("/api/v1/content/documents/page");
		expect(firstRequestUrl.searchParams.get("version")).toBe("latest");
		expect(firstRequestUrl.searchParams.get("include")).toBe("meta");
		expect(firstRequestUrl.searchParams.get("page")).toBe("1");
		expect(firstRequestUrl.searchParams.get("perPage")).toBe("10");
		expect(firstRequestUrl.searchParams.get("sort")).toBe(
			"updatedAt,-fields.pageTitle",
		);
		expect(secondRequestUrl.searchParams.get("include")).toBe("meta");
		expect(secondRequestUrl.searchParams.get("sort")).toBe(
			"updatedAt,-fields.pageTitle",
		);
	});

	test("sends a list of filters as OR groups and an empty list as one empty value", async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			Response.json({
				data: [],
				pagination: { currentPage: 1, lastPage: 1, perPage: 10, total: 0 },
			}),
		);
		const client = createClient({
			baseUrl: "https://example.com",
			auth: { type: "apiKey", apiKey: "client-key" },
			fetch: fetchMock,
			version: "latest",
		});

		await client.documents.getMultiple({
			collectionKey: "page",
			filter: [{ fields: { title: "Home" } }, { id: [] }],
		});

		const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
		expect([...url.searchParams.entries()]).toEqual([
			["filter[or][0][fields.title]", "Home"],
			["filter[or][1][id:in]", ""],
			["version", "latest"],
		]);
	});

	test("reads the client's default version unless a read names its own", async () => {
		const fetchMock = vi.fn<typeof fetch>(async () =>
			Response.json({ data: null }),
		);
		const auth = { type: "apiKey", apiKey: "client-key" } as const;
		const client = createClient({
			baseUrl: "https://example.com",
			auth,
			fetch: fetchMock,
			version: "published",
		});

		await client.documents.getSingle({ collectionKey: "page" });
		await client.documents.getSingle({
			collectionKey: "page",
			version: "latest",
		});

		expect(
			fetchMock.mock.calls.map(([url]) =>
				new URL(String(url)).searchParams.get("version"),
			),
		).toEqual(["published", "latest"]);

		const withoutVersion = createClient({
			baseUrl: "https://example.com",
			auth,
			fetch: fetchMock,
		});
		const response = await withoutVersion.documents.getMultiple({
			collectionKey: "page",
		});

		expect(response.error?.kind).toBe("configuration");
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	test("returns null data for a missing document and errors for other 404s", async () => {
		const notFound = (code: string) =>
			Response.json(
				{ name: "Not found", message: "Not found", status: 404, code },
				{ status: 404 },
			);
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(notFound("document_not_found"))
			.mockResolvedValueOnce(notFound("collection_not_found"));
		const client = createClient({
			baseUrl: "https://example.com",
			auth: { type: "apiKey", apiKey: "client-key" },
			fetch: fetchMock,
			version: "latest",
			retry: false,
		});

		const missing = await client.documents.getSingle({ collectionKey: "page" });
		const failed = await client.documents.getSingle({ collectionKey: "page" });

		expect(missing.error).toBeUndefined();
		expect(missing.data).toBeNull();
		expect(failed.data).toBeUndefined();
		expect(failed.error).toMatchObject({ kind: "http", status: 404 });
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
			auth: {
				type: "apiKey",
				apiKey: "client-key",
			},
			fetch: fetchMock,
			retry: {
				attempts: 2,
				baseDelayMs: 1,
				maxDelayMs: 1,
			},
		});

		const response = await client.media.resolveUrl({
			key: "public/example.png",
		});

		expect(response.error?.kind).toBe("http");
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	test("returns OAuth access token provider failures as values", async () => {
		const fetchMock = vi.fn<typeof fetch>();
		const client = createClient({
			baseUrl: "https://example.com",
			auth: {
				type: "oauth",
				accessToken: async () => {
					throw new Error("Unable to refresh");
				},
			},
			fetch: fetchMock,
		});

		const response = await client.locales.getAll();

		expect(response.error).toMatchObject({
			kind: "configuration",
			message: "The OAuth access token provider failed.",
		});
		expect(fetchMock).not.toHaveBeenCalled();
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
			auth: {
				type: "apiKey",
				apiKey: "client-key",
			},
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
		expect(response.data).toBeUndefined();
		expect(response.response?.status).toBe(403);
		expect(requestOrder).toEqual(["request", "response", "error"]);

		const [, init] = fetchMock.mock.calls[0] ?? [];
		expect(new Headers(init?.headers).get("x-client-test")).toBe("1");
	});

	test("returns a parse error when a successful response has no data envelope", async () => {
		const httpResponse = Response.json({ unexpected: true });
		const client = createClient({
			baseUrl: "https://example.com",
			auth: { type: "apiKey", apiKey: "client-key" },
			fetch: vi.fn<typeof fetch>().mockResolvedValue(httpResponse),
		});
		const result = await client.locales.getAll();
		expect(result.error?.kind).toBe("parse");
		expect(result.data).toBeUndefined();
		expect(result.response).toBe(httpResponse);
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
			auth: {
				type: "apiKey",
				apiKey: "client-key",
			},
			fetch: fetchMock,
			timeoutMs: 5,
		});

		const response = await client.locales.getAll();

		expect(response.error?.kind).toBe("timeout");
		expect(response.data).toBeUndefined();
	});

	test.each([undefined, 1000])(
		"accepts an AbortSignal with timeout %s and returns abort errors as values",
		async (timeoutMs) => {
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
				auth: {
					type: "apiKey",
					apiKey: "client-key",
				},
				fetch: fetchMock,
			});

			const abortController = new AbortController();
			const responsePromise = client.locales.getAll({
				request: {
					signal: abortController.signal,
					timeoutMs,
				},
			});

			abortController.abort();

			const response = await responsePromise;

			expect(response.error?.kind).toBe("abort");
			expect(response.data).toBeUndefined();
		},
	);

	test("accepts a full content endpoint base URL without duplicating the content path", async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(
				JSON.stringify({
					data: [],
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
			baseUrl: "https://example.com/api/v1/content",
			auth: {
				type: "apiKey",
				apiKey: "client-key",
			},
			fetch: fetchMock,
		});

		const response = await client.locales.getAll();

		expect(response.error).toBeUndefined();
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
			"https://example.com/api/v1/content/locales",
		);
	});
});
