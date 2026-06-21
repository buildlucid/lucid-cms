/// <reference types="@cloudflare/workers-types" />

import { describe, expect, test, vi } from "vitest";
import stream from "./stream.js";

describe("stream", () => {
	test("returns not modified when the binding condition fails", async () => {
		const get = vi.fn(async (_key: string, _options?: { onlyIf: Headers }) => ({
			etag: "etag",
			httpMetadata: {
				contentType: "image/png",
			},
		}));

		const binding = {
			get,
		} as unknown as R2Bucket;
		const service = stream({ binding: "R2" });

		const response = await service({
			key: "public/uuid",
			ifNoneMatch: '"etag"',
			tenant: null,
			context: {
				env: {
					R2: binding,
				},
			} as never,
		});

		expect(response.error).toBeUndefined();
		expect(response.data?.notModified).toBe(true);
		expect(response.data?.etag).toBe("etag");
		expect(response.data?.body).toEqual(new Uint8Array());

		const options = get.mock.calls[0]?.[1];
		if (!options) {
			throw new Error("Expected conditional options to be passed to R2");
		}

		expect(options.onlyIf.get("If-None-Match")).toBe('"etag"');
	});
});
