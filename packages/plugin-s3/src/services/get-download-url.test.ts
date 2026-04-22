import { describe, expect, it, vi } from "vitest";
import getDownloadUrl from "./get-download-url.js";

describe("getDownloadUrl", () => {
	it("uses the persisted file name for the download disposition", async () => {
		const sign = vi.fn(async (request: Request) => new Request(request.url));
		const service = getDownloadUrl(
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
			host: "https://example.com",
			secretKey: "secret",
			fileName: "Screenshot 2026-02-13 at 10.png",
		});

		expect(response.error).toBeUndefined();
		expect(response.data?.url).toBeDefined();

		const signedUrl = new URL(response.data?.url ?? "");
		expect(signedUrl.searchParams.get("response-content-disposition")).toBe(
			'attachment; filename="Screenshot 2026-02-13 at 10.png"',
		);
	});

	it("falls back to the canonical key plus extension when no file name exists", async () => {
		const sign = vi.fn(async (request: Request) => new Request(request.url));
		const service = getDownloadUrl(
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
			host: "https://example.com",
			secretKey: "secret",
			extension: "png",
		});

		expect(response.error).toBeUndefined();

		const signedUrl = new URL(response.data?.url ?? "");
		expect(signedUrl.searchParams.get("response-content-disposition")).toBe(
			'attachment; filename="uuid.png"',
		);
	});

	it("sanitizes persisted file names before serializing the download disposition", async () => {
		const sign = vi.fn(async (request: Request) => new Request(request.url));
		const service = getDownloadUrl(
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
			host: "https://example.com",
			secretKey: "secret",
			fileName: '../"Quarterly\r\nReport".png',
		});

		expect(response.error).toBeUndefined();

		const signedUrl = new URL(response.data?.url ?? "");
		expect(signedUrl.searchParams.get("response-content-disposition")).toBe(
			'attachment; filename="Quarterly Report.png"',
		);
	});
});
