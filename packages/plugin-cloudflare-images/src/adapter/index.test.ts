/// <reference types="@cloudflare/workers-types" />

import { Readable } from "node:stream";
import type { MediaTransformationOptions } from "@lucidcms/core/types";
import { describe, expect, it, vi } from "vitest";
import {
	MAX_INPUT_BYTES,
	MAX_JPEG_PNG_DIMENSION,
	MAX_SOURCE_PIXELS,
} from "../constants.js";
import cloudflareImagesDeliveryAdapter from "./index.js";

type MockBindingOptions = {
	info?: ImageInfoResponse;
	infoError?: unknown;
	contentType?: string;
	response?: Response;
};

const createMockBinding = (options: MockBindingOptions = {}) => {
	const transforms: ImageTransform[] = [];
	const output = vi.fn(async () => {
		const response =
			options.response ?? new Response(new Uint8Array([1, 2, 3]));
		return {
			response: () => response,
			contentType: () => options.contentType ?? "image/webp",
			image: () => response.body,
		} as ImageTransformationResult;
	});
	const transformer = {
		transform: vi.fn((transform: ImageTransform) => {
			transforms.push(transform);
			return transformer;
		}),
		output,
	};
	const info = vi.fn(async () => {
		if (options.infoError) throw options.infoError;
		return (
			options.info ?? {
				format: "image/webp",
				fileSize: 3,
				width: 1000,
				height: 500,
			}
		);
	});
	const input = vi.fn(() => transformer as unknown as ImageTransformer);

	return {
		binding: { info, input } as unknown as ImagesBinding,
		info,
		input,
		output,
		transforms,
	};
};

const processImage = async (props?: {
	binding?: ImagesBinding;
	buffer?: Buffer;
	options?: MediaTransformationOptions;
	bindingName?: string;
}) => {
	const bindingName = props?.bindingName ?? "LUCID_IMAGES";
	const processImage = cloudflareImagesDeliveryAdapter({
		binding: bindingName,
	}).processImage;

	if (!processImage) throw new Error("Expected image processing support");
	return await processImage(
		{
			env: props?.binding ? { [bindingName]: props.binding } : {},
		} as never,
		{
			stream: Readable.from(props?.buffer ?? Buffer.from([1, 2, 3])),
			options: props?.options ?? { format: "webp" },
		},
	);
};

const expectErrorKey = (
	result: Awaited<ReturnType<typeof processImage>>,
	key: string,
) => {
	expect(result.data).toBeUndefined();
	expect(result.error?.message).toMatchObject({
		type: "lucid.copy",
		key,
	});
};

describe("cloudflareImagesDeliveryAdapter", () => {
	it("returns an error when the configured binding is missing", async () => {
		const result = await processImage({ bindingName: "CUSTOM_IMAGES" });

		expectErrorKey(result, "plugin.cloudflare.images.errors.binding.missing");
		expect(result.error?.message).toMatchObject({
			values: { binding: "CUSTOM_IMAGES" },
		});
	});

	it("accepts the exact input byte limit", async () => {
		const mock = createMockBinding();
		const result = await processImage({
			binding: mock.binding,
			buffer: Buffer.alloc(MAX_INPUT_BYTES),
		});

		expect(result.error).toBeUndefined();
		expect(mock.info).toHaveBeenCalledOnce();
		expect(mock.input).toHaveBeenCalledOnce();
	});

	it("rejects input above the byte limit before calling the binding", async () => {
		const mock = createMockBinding();
		const result = await processImage({
			binding: mock.binding,
			buffer: Buffer.alloc(MAX_INPUT_BYTES + 1),
		});

		expectErrorKey(result, "plugin.cloudflare.images.errors.input.too.large");
		expect(mock.info).not.toHaveBeenCalled();
		expect(mock.input).not.toHaveBeenCalled();
	});

	it.each([
		"image/jpeg",
		"image/png",
		"image/webp",
	])("accepts %s source images", async (format) => {
		const mock = createMockBinding({
			info: { format, fileSize: 3, width: 100, height: 50 },
			contentType: format,
		});
		const result = await processImage({ binding: mock.binding });

		expect(result.error).toBeUndefined();
		expect(result.data?.processed).toBe(true);
	});

	it.each([
		"image/gif",
		"image/avif",
		"image/heic",
		"image/svg+xml",
		"application/octet-stream",
	])("rejects unsupported %s source images", async (format) => {
		const info =
			format === "image/svg+xml"
				? ({ format } as ImageInfoResponse)
				: ({
						format,
						fileSize: 3,
						width: 100,
						height: 50,
					} as ImageInfoResponse);
		const mock = createMockBinding({ info });
		const result = await processImage({ binding: mock.binding });

		expectErrorKey(
			result,
			"plugin.cloudflare.images.errors.input.format.unsupported",
		);
		expect(mock.input).not.toHaveBeenCalled();
	});

	it("rejects malformed metadata responses", async () => {
		const mock = createMockBinding({
			info: {
				format: "image/png",
				fileSize: 3,
				width: 0,
				height: 10,
			},
		});
		const result = await processImage({ binding: mock.binding });

		expectErrorKey(result, "plugin.cloudflare.images.errors.response.invalid");
	});

	it("rejects malformed transformation responses", async () => {
		const mock = createMockBinding({ contentType: "text/plain" });
		const result = await processImage({ binding: mock.binding });

		expectErrorKey(result, "plugin.cloudflare.images.errors.response.invalid");
	});

	it("enforces source area and JPEG/PNG edge limits", async () => {
		const areaMock = createMockBinding({
			info: {
				format: "image/webp",
				fileSize: 3,
				width: 10_001,
				height: 10_000,
			},
		});
		const areaResult = await processImage({ binding: areaMock.binding });
		expectErrorKey(
			areaResult,
			"plugin.cloudflare.images.errors.input.area.too.large",
		);
		expect(areaResult.error?.message).toMatchObject({
			values: { max: MAX_SOURCE_PIXELS },
		});

		const edgeMock = createMockBinding({
			info: {
				format: "image/png",
				fileSize: 3,
				width: MAX_JPEG_PNG_DIMENSION + 1,
				height: 1,
			},
		});
		const edgeResult = await processImage({ binding: edgeMock.binding });
		expectErrorKey(
			edgeResult,
			"plugin.cloudflare.images.errors.input.dimension.too.large",
		);
	});

	it("accepts source geometry at the documented boundaries", async () => {
		const areaMock = createMockBinding({
			info: {
				format: "image/webp",
				fileSize: 3,
				width: 10_000,
				height: 10_000,
			},
		});
		const edgeMock = createMockBinding({
			info: {
				format: "image/jpeg",
				fileSize: 3,
				width: MAX_JPEG_PNG_DIMENSION,
				height: 1,
			},
		});

		expect(
			(await processImage({ binding: areaMock.binding })).error,
		).toBeUndefined();
		expect(
			(await processImage({ binding: edgeMock.binding })).error,
		).toBeUndefined();
	});

	it("does not impose the JPEG/PNG edge limit on WebP", async () => {
		const mock = createMockBinding({
			info: {
				format: "image/webp",
				fileSize: 3,
				width: 20_000,
				height: 1,
			},
		});
		const result = await processImage({ binding: mock.binding });

		expect(result.error).toBeUndefined();
	});

	it.each([
		["contain", { width: 400, height: 300, fit: "pad", background: "#000000" }],
		["fill", { width: 400, height: 300, fit: "squeeze" }],
		["inside", { width: 400, height: 300, fit: "contain" }],
	] as const)("maps the %s fit mode", async (fit, expected) => {
		const mock = createMockBinding();
		await processImage({
			binding: mock.binding,
			options: { width: 400, height: 300, fit, format: "webp" },
		});

		expect(mock.transforms).toEqual([expected]);
	});

	it("rotates before cover resize and keeps the focal point on its subject", async () => {
		const mock = createMockBinding();
		await processImage({
			binding: mock.binding,
			options: {
				width: 400,
				height: 300,
				fit: "cover",
				focalPoint: { x: 0.2, y: 0.3 },
				rotate: 90,
				format: "webp",
			},
		});

		expect(mock.transforms).toEqual([
			{ rotate: 90 },
			{
				width: 400,
				height: 300,
				fit: "cover",
				gravity: { x: 0.7, y: 0.2, mode: "box-center" },
			},
		]);
	});

	it("maps outside to the controlling axis after rotation", async () => {
		const mock = createMockBinding();
		await processImage({
			binding: mock.binding,
			options: {
				width: 400,
				height: 400,
				fit: "outside",
				rotate: 90,
				format: "webp",
			},
		});

		expect(mock.transforms).toEqual([
			{ rotate: 90 },
			{ width: 400, fit: "contain" },
		]);
	});

	it("preserves the source format and reports actual output metadata", async () => {
		const mock = createMockBinding({
			info: {
				format: "image/png",
				fileSize: 3,
				width: 100,
				height: 50,
			},
			contentType: "image/png",
			response: new Response(new Uint8Array([1, 2, 3, 4])),
		});
		const result = await processImage({
			binding: mock.binding,
			options: { width: 50 },
		});

		expect(mock.output).toHaveBeenCalledWith({
			format: "image/png",
			anim: false,
		});
		expect(result.data).toMatchObject({
			processed: true,
			mimeType: "image/png",
			extension: "png",
			size: 4,
			shouldStore: true,
		});
	});

	it("uses the actual content type when Cloudflare falls back from AVIF", async () => {
		const mock = createMockBinding({ contentType: "image/webp" });
		const result = await processImage({
			binding: mock.binding,
			options: { format: "avif", quality: 75 },
		});

		expect(mock.output).toHaveBeenCalledWith({
			format: "image/avif",
			quality: 75,
			anim: false,
		});
		expect(result.data).toMatchObject({
			mimeType: "image/webp",
			extension: "webp",
		});
	});

	it.each([
		[{ rotate: 45 }, "plugin.cloudflare.images.errors.rotate.unsupported"],
		[
			{ format: "gif" },
			"plugin.cloudflare.images.errors.output.format.unsupported",
		],
		[{ quality: 0 }, "plugin.cloudflare.images.errors.quality.invalid"],
		[{ quality: 10.5 }, "plugin.cloudflare.images.errors.quality.invalid"],
	] as const)("rejects invalid direct processor options", async (options, key) => {
		const mock = createMockBinding();
		const result = await processImage({
			binding: mock.binding,
			options: options as MediaTransformationOptions,
		});

		expectErrorKey(result, key);
		expect(mock.info).not.toHaveBeenCalled();
	});

	it.each([
		[9413, "plugin.cloudflare.images.errors.cloudflare.validation"],
		[9422, "plugin.cloudflare.images.errors.cloudflare.configuration"],
		[9529, "plugin.cloudflare.images.errors.cloudflare.transient"],
		[9999, "plugin.cloudflare.images.errors.unknown"],
	] as const)("maps Cloudflare error %s", async (code, key) => {
		const mock = createMockBinding({ infoError: { code } });
		const result = await processImage({ binding: mock.binding });

		expectErrorKey(result, key);
	});

	it("maps non-success transformation responses", async () => {
		const mock = createMockBinding({
			response: new Response("failed", {
				status: 415,
				headers: { "cf-images-binding": "err=9520" },
			}),
		});
		const result = await processImage({ binding: mock.binding });

		expectErrorKey(
			result,
			"plugin.cloudflare.images.errors.cloudflare.validation",
		);
	});
});
