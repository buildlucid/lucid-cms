import crypto from "node:crypto";
import { describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	checkHasMediaStorage: vi.fn(),
	optimizeImage: vi.fn(),
	getSingleCount: vi.fn(),
	selectSingle: vi.fn(),
}));

vi.mock("../../libs/repositories/index.js", () => ({
	MediaRepository: class {
		selectSingle = mocks.selectSingle;
	},
	ProcessedImagesRepository: class {},
}));

vi.mock("../media/checks/check-has-media-storage.js", () => ({
	default: mocks.checkHasMediaStorage,
}));

vi.mock("./get-single-count.js", () => ({
	default: mocks.getSingleCount,
}));

vi.mock("./optimize-image.js", () => ({
	default: mocks.optimizeImage,
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
		mocks.selectSingle.mockResolvedValueOnce({
			error: undefined,
			data: { focal_x: null, focal_y: null },
		});
		const sourceBody = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new TextEncoder().encode("fallback-image"));
				controller.close();
			},
		});

		mocks.checkHasMediaStorage.mockResolvedValueOnce({
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
				db: {},
				config: {
					db: {},
					media: {
						limits: {},
						images: {
							cache: {
								enabled: false,
								maxVariantsPerFile: 10,
							},
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

	test.each([
		{
			key: "media/original.svg",
			contentType: "image/svg+xml",
			source: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
		},
		{
			key: "media/original.png",
			contentType: "image/png",
			source: "original-png-bytes",
		},
	])("returns the original $contentType response when processing is a no-op", async ({
		key,
		contentType,
		source,
	}) => {
		mocks.selectSingle.mockResolvedValueOnce({
			error: undefined,
			data: { focal_x: null, focal_y: null },
		});
		const sourceBytes = new TextEncoder().encode(source);
		const sourceBody = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(sourceBytes);
				controller.close();
			},
		});

		mocks.checkHasMediaStorage.mockResolvedValueOnce({
			error: undefined,
			data: {
				stream: vi.fn().mockResolvedValue({
					error: undefined,
					data: {
						contentLength: sourceBytes.length,
						contentType,
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
				processed: false,
			},
		});

		mocks.getSingleCount.mockResolvedValueOnce({
			error: undefined,
			data: 0,
		});

		const response = await processImage(
			{
				db: {},
				config: {
					db: {},
					media: {
						limits: {},
						images: {
							cache: {
								enabled: false,
								maxVariantsPerFile: 10,
							},
						},
					},
				},
			} as never,
			{
				key,
				processKey: "media/processed.webp",
				options: {
					format: "webp",
				},
			},
		);

		expect(response.error).toBeUndefined();
		expect(response.data).toMatchObject({
			key,
			contentLength: sourceBytes.length,
			contentType,
			etag: "source-etag",
		});
		expect(
			await readStream(response.data?.body as ReadableStream<Uint8Array>),
		).toBe(source);
	});

	test("returns a stable etag for generated processed images and short-circuits matching revalidation requests", async () => {
		mocks.selectSingle.mockResolvedValueOnce({
			error: undefined,
			data: { focal_x: null, focal_y: null },
		});
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

		mocks.checkHasMediaStorage.mockResolvedValueOnce({
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
				processed: true,
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
				db: {},
				config: {
					db: {},
					media: {
						limits: {},
						images: {
							cache: {
								enabled: false,
								maxVariantsPerFile: 10,
							},
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
