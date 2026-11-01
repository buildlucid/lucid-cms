import crypto from "node:crypto";
import { afterEach, describe, expect, test, vi } from "vitest";

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
				sourceEtag: null,
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
	])(
		"returns the original $contentType response when processing is a no-op",
		async ({ key, contentType, source }) => {
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
					sourceEtag: null,
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
		},
	);

	test("hashes the resized bytes for the etag when the original has none", async () => {
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
				sourceEtag: null,
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

	describe("etags from the original", () => {
		afterEach(() => {
			vi.resetAllMocks();
		});

		/** Runs processImage for an image that is resized but not stored. */
		const runProcessImage = async (props: {
			sourceEtag: string;
			ifNoneMatch?: string;
			focal?: { focal_x: number; focal_y: number };
		}) => {
			const processedBuffer = Buffer.from("processed-image");
			const stream = vi.fn().mockResolvedValue({
				error: undefined,
				data: {
					contentLength: 12,
					contentType: "image/png",
					body: new TextEncoder().encode("source-image"),
					etag: props.sourceEtag,
				},
			});

			mocks.checkHasMediaStorage.mockResolvedValue({
				error: undefined,
				data: { stream, upload: vi.fn() },
			});
			mocks.selectSingle.mockResolvedValue({
				error: undefined,
				data: props.focal ?? { focal_x: null, focal_y: null },
			});
			mocks.optimizeImage.mockResolvedValue({
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
			mocks.getSingleCount.mockResolvedValue({
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
					sourceEtag: props.sourceEtag,
					ifNoneMatch: props.ifNoneMatch,
					options: {
						format: "webp",
					},
				},
			);

			return { response, stream };
		};

		test("answers a matching revalidation without downloading or resizing the original", async () => {
			const first = await runProcessImage({ sourceEtag: "source-etag" });
			expect(first.response.data?.etag).toMatch(/^W\/"/);

			const second = await runProcessImage({
				sourceEtag: "source-etag",
				ifNoneMatch: first.response.data?.etag ?? undefined,
			});

			expect(second.response.data?.notModified).toBe(true);
			expect(second.stream).not.toHaveBeenCalled();
			expect(mocks.optimizeImage).toHaveBeenCalledTimes(1);
		});

		test.each([
			{ change: "the original", sourceEtag: "new-source-etag" },
			{
				change: "the focal point",
				sourceEtag: "source-etag",
				focal: { focal_x: 2500, focal_y: 7500 },
			},
		])("resizes again when $change changes", async ({ sourceEtag, focal }) => {
			const first = await runProcessImage({ sourceEtag: "source-etag" });

			const second = await runProcessImage({
				sourceEtag,
				focal,
				ifNoneMatch: first.response.data?.etag ?? undefined,
			});

			expect(second.response.data?.notModified).toBeUndefined();
			expect(second.response.data?.etag).not.toBe(first.response.data?.etag);
			expect(mocks.optimizeImage).toHaveBeenCalledTimes(2);
		});
	});
});
