import { afterEach, describe, expect, test, vi } from "vitest";
import { LUCID_REMOTE_API_OVERRIDE_ENV } from "./origin.js";
import { getLucidRemotePublicClient } from "./public-client.js";

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("Lucid Remote public client", () => {
	test("posts JSON without origin, authorization, retries, or response parsing", async () => {
		const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
		vi.stubGlobal("fetch", fetchMock);
		const client = getLucidRemotePublicClient({
			[LUCID_REMOTE_API_OVERRIDE_ENV]: "http://127.0.0.1:43111",
		});

		await expect(
			client.post("/v1/telemetry/events", { schema_version: 1 }),
		).resolves.toBe(true);

		expect(fetchMock).toHaveBeenCalledOnce();
		const [url, init] = fetchMock.mock.calls[0] ?? [];
		expect(String(url)).toBe("http://127.0.0.1:43111/v1/telemetry/events");
		const headers = new Headers(init?.headers);
		expect(headers.get("Content-Type")).toBe("application/json");
		expect(headers.has("Origin")).toBe(false);
		expect(headers.has("Authorization")).toBe(false);
		expect(init?.redirect).toBe("error");
		expect(init?.body).toBe('{"schema_version":1}');
	});

	test("contains transport failures", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error("network unavailable");
			}),
		);
		const client = getLucidRemotePublicClient({
			[LUCID_REMOTE_API_OVERRIDE_ENV]: "http://127.0.0.1:43112",
		});

		await expect(client.post("/v1/telemetry/events", {})).resolves.toBe(false);
	});

	test("reads JSON without origin or authorization, and contains failed responses", async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(Response.json({ data: [] }))
			.mockResolvedValueOnce(new Response(null, { status: 503 }));
		vi.stubGlobal("fetch", fetchMock);
		const client = getLucidRemotePublicClient({
			[LUCID_REMOTE_API_OVERRIDE_ENV]: "http://127.0.0.1:43113",
		});

		await expect(client.get("/v1/announcements")).resolves.toEqual({
			data: [],
		});
		await expect(client.get("/v1/announcements")).resolves.toBeNull();

		const [url, init] = fetchMock.mock.calls[0] ?? [];
		expect(String(url)).toBe("http://127.0.0.1:43113/v1/announcements");
		const headers = new Headers(init?.headers);
		expect(headers.has("Origin")).toBe(false);
		expect(headers.has("Authorization")).toBe(false);
		expect(init?.redirect).toBe("error");
	});
});
