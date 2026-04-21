/// <reference types="@cloudflare/workers-types" />

import { describe, expect, test, vi } from "vitest";
import { STORAGE_UPLOAD_PATH } from "../constants.js";
import { createSignedMediaToken } from "../utils/signed-media-url.js";
import storageUpload from "./storage-upload.js";

const createBody = (chunks: number[]) =>
	new ReadableStream<Uint8Array>({
		start(controller) {
			for (const size of chunks) {
				controller.enqueue(new Uint8Array(size));
			}
			controller.close();
		},
	});

describe("storage upload", () => {
	test("rejects uploads that exceed the configured limit", async () => {
		const timestamp = `${Date.now()}`;
		const service = storageUpload({
			binding: {
				put: vi.fn(async (_key, body) => {
					if (body instanceof ReadableStream) {
						const reader = body.getReader();
						while (true) {
							const result = await reader.read();
							if (result.done) {
								break;
							}
						}
					}

					return {
						etag: "etag",
					};
				}),
			} as unknown as R2Bucket,
		});

		const response = await service(
			{
				config: {
					media: {
						limits: {
							fileSize: 3,
						},
					},
					secrets: {
						cookie: "a".repeat(64),
					},
				},
			} as never,
			{
				key: "public/test.png",
				timestamp,
				token: createSignedMediaToken({
					path: STORAGE_UPLOAD_PATH,
					key: "public/test.png",
					timestamp,
					secretKey: "a".repeat(64),
					query: {
						extension: "png",
					},
				}),
				extension: "png",
				contentType: "image/png",
				contentLength: 4,
				body: createBody([2, 2]),
			},
		);

		expect(response.error?.status).toBe(413);
	});

	test("requires a content-length header for binding uploads", async () => {
		const timestamp = `${Date.now()}`;
		const service = storageUpload({
			binding: {
				put: vi.fn(),
			} as unknown as R2Bucket,
		});

		const response = await service(
			{
				config: {
					media: {
						limits: {
							fileSize: 10,
						},
					},
					secrets: {
						cookie: "a".repeat(64),
					},
				},
			} as never,
			{
				key: "public/test.png",
				timestamp,
				token: createSignedMediaToken({
					path: STORAGE_UPLOAD_PATH,
					key: "public/test.png",
					timestamp,
					secretKey: "a".repeat(64),
					query: {
						extension: "png",
					},
				}),
				extension: "png",
				contentType: "image/png",
				body: createBody([2]),
			},
		);

		expect(response.error?.status).toBe(411);
	});
});
