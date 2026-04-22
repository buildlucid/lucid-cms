import { afterEach, describe, expect, it, vi } from "vitest";
import stream from "./steam.js";

describe("stream", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns not modified when s3 responds with 304", async () => {
		const sign = vi.fn(async (request: Request) => request);
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(null, {
				status: 304,
				headers: {
					etag: '"etag"',
				},
			}),
		);

		const service = stream(
			{
				sign,
			} as never,
			{
				endpoint: "https://r2.example.com",
				bucket: "media",
				clientOptions: {
					accessKeyId: "key",
					secretAccessKey: "secret",
				},
			},
		);

		const response = await service("public/uuid", {
			ifNoneMatch: '"etag"',
		});

		expect(response.error).toBeUndefined();
		expect(response.data?.notModified).toBe(true);
		expect(response.data?.etag).toBe('"etag"');
		expect(response.data?.body).toEqual(new Uint8Array());

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.headers.get("If-None-Match")).toBe('"etag"');
	});
});
