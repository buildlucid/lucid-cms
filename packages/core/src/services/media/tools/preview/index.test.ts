import { afterAll, beforeEach, expect, test, vi } from "vitest";
import { createTranslationStore } from "../../../../libs/i18n/index.js";
import type { MediaDeliveryAdapterInstance } from "../../../../libs/media-delivery/types.js";
import type { MediaStorageAdapterInstance } from "../../../../libs/media-storage/types.js";
import { toolDefinitionInternal } from "../../../../libs/tools/registry.js";
import type { Media } from "../../../../types/response.js";
import createServiceContext from "../../../../utils/services/create-service-context.js";
import getTestConfig from "../../../../utils/test-helpers/get-test-config.js";
import checkHasMediaStorage from "../../checks/check-has-media-storage.js";
import getSingle from "../../get-single.js";
import { previewMediaMcpTool } from "./index.js";

vi.mock("../../get-single.js");
vi.mock("../../checks/check-has-media-storage.js");

const testConfig = getTestConfig();
afterAll(testConfig.destroy);
beforeEach(() => vi.resetAllMocks());

const png = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lQAAAABJRU5ErkJggg==",
	"base64",
);

const image = {
	id: 1,
	type: "image",
	status: "ready",
	folderId: null,
	origin: "human",
	title: null,
	public: false,
	isDeleted: false,
	isDeletedAt: null,
	deletedBy: null,
	createdAt: null,
	updatedAt: null,
	alt: null,
	key: "private/preview-image",
	url: "",
	fileName: "preview.png",
	meta: {
		mimeType: "image/png",
		extension: "png",
		fileSize: png.byteLength,
		width: 1,
		height: 1,
		focalPoint: null,
		blurHash: null,
		averageColor: null,
		base64: null,
		isDark: null,
		isLight: null,
	},
	delivery: {
		adapter: "passthrough",
		data: null,
		supportsPresetQuery: false,
	},
	sourceType: "original",
} satisfies Media;

const run = async (
	media: Media,
	inline = false,
	processImage?: MediaDeliveryAdapterInstance["processImage"],
) => {
	vi.mocked(getSingle).mockResolvedValue({ error: undefined, data: media });
	const stream = vi.fn().mockResolvedValue({
		error: undefined,
		data: {
			body: png,
			contentLength: png.byteLength,
			contentType: "image/png",
		},
	});
	vi.mocked(checkHasMediaStorage).mockResolvedValue({
		error: undefined,
		data: { stream } as unknown as MediaStorageAdapterInstance,
	});
	const config = await testConfig.getConfig();
	const baseContext = createServiceContext({
		config,
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
	const context = processImage
		? {
				...baseContext,
				mediaDelivery: { ...baseContext.mediaDelivery, processImage },
			}
		: baseContext;
	const prepared = await previewMediaMcpTool[
		toolDefinitionInternal
	].prepareInput({
		id: 1,
		inline,
	});
	if (prepared.type !== "ready") throw new Error("Expected valid input");
	const result = await prepared.data.run({
		context,
		execution: {
			authority: { principal: { type: "system" }, scopes: ["media:read"] },
			signal: new AbortController().signal,
		},
	});
	return { result, stream };
};

test("inlines a private stored image even when delivery has no URL", async () => {
	const { result, stream } = await run(image);
	expect(result.type).toBe("success");
	if (result.type !== "success") return;
	expect(result.data.content).toEqual([
		{ type: "image", data: png.toString("base64"), mimeType: "image/png" },
	]);
	expect(result.data.output).toEqual({
		data: {
			kind: "inline",
			id: 1,
			mimeType: "image/png",
			byteLength: png.byteLength,
		},
	});
	expect(stream).toHaveBeenCalledWith(expect.anything(), {
		key: image.key,
	});
});

test("returns a resource link for a public image on the CMS domain", async () => {
	const publicImage = {
		...image,
		public: true,
		url: "https://cms.example.com/lucid/cdn/public/preview-image.png",
	} satisfies Media;
	const { result, stream } = await run(publicImage);
	expect(result.type).toBe("success");
	if (result.type !== "success") return;
	expect(result.data.content).toEqual([
		{
			type: "resource_link",
			uri: publicImage.url,
			name: publicImage.fileName,
			mimeType: "image/png",
		},
	]);
	expect(stream).not.toHaveBeenCalled();
});

test("inlines a public image when requested", async () => {
	const { result, stream } = await run(
		{
			...image,
			public: true,
			url: "https://cms.example.com/lucid/cdn/public/preview-image.png",
		},
		true,
	);
	expect(result.type).toBe("success");
	if (result.type !== "success") return;
	expect(result.data.content?.[0]?.type).toBe("image");
	expect(stream).toHaveBeenCalledOnce();
});

test("rejects an oversized original when no image processor is configured", async () => {
	const { result, stream } = await run({
		...image,
		meta: { ...image.meta, fileSize: 2 * 1024 * 1024, width: 2_000 },
	});
	expect(result.type).toBe("failed");
	expect(stream).not.toHaveBeenCalled();
});

test("requests a 1024px thumbnail and retries until it fits 1MiB", async () => {
	const processor = vi
		.fn<NonNullable<MediaDeliveryAdapterInstance["processImage"]>>()
		.mockResolvedValueOnce({
			error: undefined,
			data: {
				processed: true,
				buffer: Buffer.alloc(1024 * 1024 + 1),
				mimeType: "image/webp",
				size: 1024 * 1024 + 1,
				extension: "webp",
				shouldStore: false,
			},
		})
		.mockResolvedValueOnce({
			error: undefined,
			data: {
				processed: true,
				buffer: png,
				mimeType: "image/png",
				size: png.byteLength,
				extension: "png",
				shouldStore: false,
			},
		});
	const { result, stream } = await run(image, false, processor);
	expect(result.type).toBe("success");
	if (result.type !== "success") return;
	expect(result.data.content).toEqual([
		{ type: "image", data: png.toString("base64"), mimeType: "image/png" },
	]);
	expect(result.data.output).toMatchObject({
		data: { kind: "inline", byteLength: png.byteLength },
	});
	expect(stream).toHaveBeenCalledTimes(2);
	expect(processor.mock.calls.map(([, params]) => params.options)).toEqual([
		{ width: 1024, height: 1024, fit: "inside", format: "webp", quality: 75 },
		{ width: 1024, height: 1024, fit: "inside", format: "webp", quality: 50 },
	]);
});

test.each([
	"http://127.0.0.1:8080/preview.png",
	"http://10.0.0.8/preview.png",
	"https://storage.local/preview.png",
])("inlines a public image whose delivery URL is local: %s", async (url) => {
	const { result, stream } = await run({
		...image,
		public: true,
		url,
	});
	expect(result.type).toBe("success");
	if (result.type !== "success") return;
	expect(result.data.content?.[0]?.type).toBe("image");
	expect(stream).toHaveBeenCalledOnce();
});
