import { describe, expect, it, vi } from "vitest";
import type { MediaDeliveryFile } from "../../libs/media-delivery/types.js";
import resolveDeliveryUrl from "./resolve-delivery-url.js";

const file: MediaDeliveryFile = {
	key: "public/video",
	fileName: "video.mp4",
	type: "video",
	mimeType: "video/mp4",
	extension: "mp4",
	width: 1920,
	height: 1080,
	duration: 12.5,
	focalPoint: null,
	storage: {
		adapterKey: "provider",
		adapterReference: "asset-1",
		adapterData: null,
	},
};

describe("resolve delivery URL", () => {
	it("passes the preset name and transformation to external adapters", () => {
		const resolveFile = vi.fn(() => ({
			type: "external" as const,
			url: "https://cdn.example.com/video?w=320",
		}));
		const result = resolveDeliveryUrl({
			delivery: {
				type: "media-delivery-adapter",
				key: "provider",
				resolveFile,
			},
			file,
			host: "https://cms.example.com",
			public: true,
			preset: "thumbnail",
			transformation: { width: 320 },
		});

		expect(result).toBe("https://cdn.example.com/video?w=320");
		expect(resolveFile).toHaveBeenCalledWith(
			expect.objectContaining({
				preset: "thumbnail",
				transformation: { width: 320 },
			}),
		);
	});

	it("returns no transformed URL when the adapter cannot process it", () => {
		const result = resolveDeliveryUrl({
			delivery: {
				type: "media-delivery-adapter",
				key: "provider",
				resolveFile: () => ({ type: "unsupported" }),
			},
			file,
			host: "https://cms.example.com",
			public: true,
			preset: "thumbnail",
			transformation: { width: 320 },
		});

		expect(result).toBeNull();
	});

	it("falls back to Lucid when an adapter cannot deliver the original file", () => {
		const result = resolveDeliveryUrl({
			delivery: {
				type: "media-delivery-adapter",
				key: "provider",
				resolveFile: () => ({ type: "unsupported" }),
			},
			file,
			host: "https://cms.example.com",
			public: true,
		});

		expect(result).toBe(
			"https://cms.example.com/lucid/cdn/public/video/video.mp4",
		);
	});

	it("keeps private media on Lucid and rejects unavailable transforms", () => {
		const resolveFile = vi.fn(() => ({
			type: "external" as const,
			url: "https://cdn.example.com/video",
		}));
		const delivery = {
			type: "media-delivery-adapter" as const,
			key: "provider",
			resolveFile,
		};

		expect(
			resolveDeliveryUrl({
				delivery,
				file,
				host: "https://cms.example.com",
				public: false,
			}),
		).toBe("https://cms.example.com/lucid/cdn/public/video/video.mp4");
		expect(
			resolveDeliveryUrl({
				delivery,
				file,
				host: "https://cms.example.com",
				public: false,
				transformation: { width: 320 },
			}),
		).toBeNull();
		expect(resolveFile).not.toHaveBeenCalled();
	});
});
