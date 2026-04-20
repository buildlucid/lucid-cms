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
						status: "latest",
						version: {
							latest: null,
						},
						createdBy: null,
						createdAt: null,
						updatedAt: null,
						updatedBy: null,
						fields: null,
						refs: null,
					},
					meta: {
						links: [],
						path: "https://example.com/lucid/api/v1/client/document/page/latest",
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
			query: {
				filter: {
					_fullSlug: {
						value: "/about",
					},
				},
				include: ["bricks"],
			},
		});

		expect(response.error).toBeUndefined();
		expect(response.data?.data.id).toBe(1);
		expect(response.data?.meta.path).toBe(
			"https://example.com/lucid/api/v1/client/document/page/latest",
		);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		const [url, init] = fetchMock.mock.calls[0] ?? [];
		expect(String(url)).toContain(
			"/document/page/latest?filter%5B_fullSlug%5D=%2Fabout&include=bricks",
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
							path: "https://example.com/lucid/api/v1/client/documents/page/latest",
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
		});

		expect(response.error).toBeUndefined();
		expect(response.data?.data).toEqual([]);
		expect(response.data?.meta.total).toBe(0);
		expect(response.data).toEqual({
			data: [],
			meta: {
				links: [],
				path: "https://example.com/lucid/api/v1/client/documents/page/latest",
				currentPage: 1,
				lastPage: 1,
				perPage: 10,
				total: 0,
			},
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
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
