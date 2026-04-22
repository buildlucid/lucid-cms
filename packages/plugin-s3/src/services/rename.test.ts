import { afterEach, describe, expect, it, vi } from "vitest";
import rename from "./rename.js";

describe("rename", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("verifies the copied object before deleting the source", async () => {
		const sign = vi.fn(async (request: Request) => request);
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(new Response(null, { status: 200 }))
			.mockResolvedValueOnce(new Response(null, { status: 200 }))
			.mockResolvedValueOnce(new Response(null, { status: 204 }));

		const service = rename(
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

		const response = await service({
			from: "public/source.png",
			to: "public/target.png",
		});

		expect(response.error).toBeUndefined();
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(
			fetchMock.mock.calls.map(([request]) => (request as Request).method),
		).toEqual(["PUT", "HEAD", "DELETE"]);
	});
});
