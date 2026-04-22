import crypto from "node:crypto";
import { describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	checkHasMediaStrategy: vi.fn(),
	optimizeImage: vi.fn(),
	getSingleCount: vi.fn(),
}));

vi.mock("../index.js", () => ({
	mediaServices: {
		checks: {
			checkHasMediaStrategy: mocks.checkHasMediaStrategy,
		},
	},
	optionServices: {
		adjustInt: vi.fn(),
	},
	processedImageServices: {
		optimizeImage: mocks.optimizeImage,
		getSingleCount: mocks.getSingleCount,
		checks: {
			checkCanStore: vi.fn(),
		},
	},
}));

import processImage from "./process-image.js";

const readStream = async (body: ReadableStream<Uint8Array>) => {
	const reader = body.getReader();
	const chunks: Uint8Array[] = [];

	while (true) {
		const result = await reader.read();
		if (result.done) break;
		chunks.push(result.value);
	}

	return new TextDecoder().decode(Buffer.concat(chunks));
};

describe("processImage", () => {
	test("keeps a readable fallback body when processing fails for web streams", async () => {
		const sourceBody = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new TextEncoder().encode("fallback-image"));
				controller.close();
			},
		});

		mocks.checkHasMediaStrategy.mockResolvedValueOnce({
			error: undefined,
			data: {
				stream: vi.fn().mockResolvedValue({
					error: undefined,
					data: {
						contentLength: 14,
						contentType: "image/jpeg",
						body: sourceBody,
					},
				}),
				upload: vi.fn(),
			},
		});

		mocks.optimizeImage.mockResolvedValueOnce({
			error: {
				type: "basic",
				message: "processing failed",
			},
			data: undefined,
		});

		mocks.getSingleCount.mockResolvedValueOnce({
			error: undefined,
			data: 0,
		});

		const response = await processImage(
			{
				config: {
					media: {
						limits: {
							processedImages: 10,
						},
						images: {
							storeProcessed: false,
						},
					},
				},
			} as never,
			{
				key: "media/original.jpg",
				processKey: "media/processed.webp",
				options: {
					format: "webp",
				},
			},
		);

		expect(response.error).toBeUndefined();
		expect(response.data?.body).toBeInstanceOf(ReadableStream);
		expect(
			await readStream(response.data?.body as ReadableStream<Uint8Array>),
		).toBe("fallback-image");
	});

	test("returns a stable etag for generated processed images and short-circuits matching revalidation requests", async () => {
		const sourceBody = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new TextEncoder().encode("source-image"));
				controller.close();
			},
		});
		const processedBuffer = Buffer.from("processed-image");
		const processedEtag = crypto
			.createHash("md5")
			.update(processedBuffer)
			.digest("hex");

		mocks.checkHasMediaStrategy.mockResolvedValueOnce({
			error: undefined,
			data: {
				stream: vi.fn().mockResolvedValue({
					error: undefined,
					data: {
						contentLength: 12,
						contentType: "image/png",
						body: sourceBody,
						etag: "source-etag",
					},
				}),
				upload: vi.fn(),
			},
		});

		mocks.optimizeImage.mockResolvedValueOnce({
			error: undefined,
			data: {
				buffer: processedBuffer,
				mimeType: "image/webp",
				size: processedBuffer.length,
				extension: "webp",
				shouldStore: false,
			},
		});

		mocks.getSingleCount.mockResolvedValueOnce({
			error: undefined,
			data: 0,
		});

		const response = await processImage(
			{
				config: {
					media: {
						limits: {
							processedImages: 10,
						},
						images: {
							storeProcessed: false,
						},
					},
				},
			} as never,
			{
				key: "media/original.png",
				processKey: "media/processed.webp",
				ifNoneMatch: `"${processedEtag}"`,
				options: {
					format: "webp",
				},
			},
		);

		expect(response.error).toBeUndefined();
		expect(response.data?.etag).toBe(processedEtag);
		expect(response.data?.notModified).toBe(true);
		expect(response.data?.body).toEqual(new Uint8Array());
	});
});
