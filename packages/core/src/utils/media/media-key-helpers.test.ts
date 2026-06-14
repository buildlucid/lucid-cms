import crypto from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import buildDownloadContentDisposition from "./build-download-content-disposition.js";
import changeKeyTenant from "./change-key-tenant.js";
import createMediaUrl from "./create-media-url.js";
import formatMediaBrowserKey from "./format-media-browser-key.js";
import generateKey from "./generate-key.js";
import generateProcessKey from "./generate-process-key.js";
import getDownloadFileName from "./get-download-file-name.js";
import { getMediaKeyParts, getMediaKeyTenantKey } from "./media-key-tenant.js";
import normalizeMediaKey from "./normalize-media-key.js";

describe("media key helpers", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("generates canonical UUID-based public keys", () => {
		vi.spyOn(crypto, "randomUUID").mockReturnValue(
			"123e4567-e89b-12d3-a456-426614174000",
		);

		const result = generateKey({
			name: "Screenshot 2026-02-13 at 10.png",
			public: true,
		});

		expect(result.error).toBeUndefined();
		expect(result.data).toBe("public/123e4567e89b12d3a456426614174000");
	});

	it("generates tenant-scoped media keys", () => {
		vi.spyOn(crypto, "randomUUID").mockReturnValue(
			"123e4567-e89b-12d3-a456-426614174000",
		);

		const result = generateKey({
			name: "Screenshot 2026-02-13 at 10.png",
			public: true,
			tenantKey: "marketing",
		});

		expect(result.error).toBeUndefined();
		expect(result.data).toBe(
			"public/marketing/123e4567e89b12d3a456426614174000",
		);
	});

	it("generates temporary awaiting-sync keys for replacement uploads", () => {
		vi.spyOn(crypto, "randomUUID").mockReturnValue(
			"123e4567-e89b-12d3-a456-426614174000",
		);

		const result = generateKey({
			name: "replacement.png",
			public: true,
			temporary: true,
		});

		expect(result.error).toBeUndefined();
		expect(result.data).toBe("awaiting-sync/123e4567e89b12d3a456426614174000");
	});

	it("generates tenant-scoped temporary awaiting-sync keys", () => {
		vi.spyOn(crypto, "randomUUID").mockReturnValue(
			"123e4567-e89b-12d3-a456-426614174000",
		);

		const result = generateKey({
			name: "replacement.png",
			public: true,
			temporary: true,
			tenantKey: "marketing",
		});

		expect(result.error).toBeUndefined();
		expect(result.data).toBe(
			"awaiting-sync/marketing/123e4567e89b12d3a456426614174000",
		);
	});

	it("formats originals with a visual filename segment", () => {
		expect(
			formatMediaBrowserKey({
				key: "public/123e4567e89b12d3a456426614174000",
				fileName: "Screenshot 2026-02-13 at 10.png",
				extension: "png",
			}),
		).toBe(
			"public/123e4567e89b12d3a456426614174000/screenshot-2026-02-13-at-10.png",
		);
	});

	it("formats processed keys with a visual filename segment", () => {
		expect(
			formatMediaBrowserKey({
				key: "public/processed/123e4567e89b12d3a456426614174000-w400-fwebp",
				fileName: "Screenshot 2026-02-13 at 10.png",
				extension: "webp",
			}),
		).toBe(
			"public/processed/123e4567e89b12d3a456426614174000-w400-fwebp/screenshot-2026-02-13-at-10.webp",
		);
	});

	it("omits the visual extension when it is not available", () => {
		expect(
			formatMediaBrowserKey({
				key: "public/123e4567e89b12d3a456426614174000",
				fileName: "Screenshot 2026-02-13 at 10.png",
			}),
		).toBe(
			"public/123e4567e89b12d3a456426614174000/screenshot-2026-02-13-at-10",
		);
	});

	it("normalizes original display keys back to their canonical storage key", () => {
		expect(
			normalizeMediaKey(
				"public/123e4567e89b12d3a456426614174000/screenshot-2026-02-13-at-10",
			),
		).toBe("public/123e4567e89b12d3a456426614174000");
	});

	it("normalizes processed display keys back to their canonical storage key", () => {
		expect(
			normalizeMediaKey(
				"public/processed/123e4567e89b12d3a456426614174000-w400-fwebp/screenshot-2026-02-13-at-10",
			),
		).toBe("public/processed/123e4567e89b12d3a456426614174000-w400-fwebp");
	});

	it("normalizes tenant-scoped display keys back to their canonical storage key", () => {
		expect(
			normalizeMediaKey(
				"public/marketing/123e4567e89b12d3a456426614174000/screenshot-2026-02-13-at-10",
			),
		).toBe("public/marketing/123e4567e89b12d3a456426614174000");
		expect(
			normalizeMediaKey(
				"public/marketing/processed/123e4567e89b12d3a456426614174000-w400-fwebp/screenshot-2026-02-13-at-10",
			),
		).toBe(
			"public/marketing/processed/123e4567e89b12d3a456426614174000-w400-fwebp",
		);
	});

	it("parses media key parts from global and tenant-scoped keys", () => {
		expect(
			getMediaKeyParts(
				"public/123e4567e89b12d3a456426614174000/screenshot-2026-02-13-at-10",
			),
		).toMatchObject({
			root: "public",
			visibility: "public",
			tenantKey: null,
			identity: "123e4567e89b12d3a456426614174000",
			isProcessed: false,
		});
		expect(
			getMediaKeyParts(
				"public/marketing/processed/123e4567e89b12d3a456426614174000-w400-fwebp",
			),
		).toMatchObject({
			root: "public",
			visibility: "public",
			tenantKey: "marketing",
			identity: "123e4567e89b12d3a456426614174000-w400-fwebp",
			isProcessed: true,
		});
	});

	it("extracts tenant keys from tenant-aware media keys", () => {
		expect(
			getMediaKeyTenantKey("public/marketing/123e4567e89b12d3a456426614174000"),
		).toBe("marketing");
		expect(
			getMediaKeyTenantKey("public/123e4567e89b12d3a456426614174000"),
		).toBeNull();
	});

	it("rewrites the tenant segment without changing the media identity", () => {
		expect(
			changeKeyTenant({
				key: "public/123e4567e89b12d3a456426614174000",
				tenantKey: "marketing",
			}),
		).toBe("public/marketing/123e4567e89b12d3a456426614174000");
		expect(
			changeKeyTenant({
				key: "public/marketing/123e4567e89b12d3a456426614174000",
				tenantKey: null,
			}),
		).toBe("public/123e4567e89b12d3a456426614174000");
	});

	it("generates processed image keys under the source tenant segment", () => {
		expect(
			generateProcessKey({
				key: "public/marketing/123e4567e89b12d3a456426614174000",
				options: {
					width: 400,
					format: "webp",
				},
				extension: "png",
			}),
		).toBe(
			"public/marketing/processed/123e4567e89b12d3a456426614174000-w400-fwebp",
		);
	});

	it("creates browser-facing URLs for processed media without version params", () => {
		expect(
			createMediaUrl({
				host: "https://example.com",
				key: "public/processed/123e4567e89b12d3a456426614174000-w400-fwebp",
				fileName: "Screenshot 2026-02-13 at 10.png",
				extension: "webp",
				query: {
					preset: "thumbnail-small",
					format: "webp",
				},
			}),
		).toBe(
			"https://example.com/lucid/cdn/public/processed/123e4567e89b12d3a456426614174000-w400-fwebp/screenshot-2026-02-13-at-10.webp?preset=thumbnail-small&format=webp",
		);
	});

	it("prefers the stored file name for downloads", () => {
		expect(
			getDownloadFileName({
				key: "public/123e4567e89b12d3a456426614174000",
				fileName: "Screenshot 2026-02-13 at 10.png",
			}),
		).toBe("Screenshot 2026-02-13 at 10.png");
	});

	it("falls back to the canonical basename for downloads", () => {
		expect(
			getDownloadFileName({
				key: "public/123e4567e89b12d3a456426614174000",
				extension: "png",
			}),
		).toBe("123e4567e89b12d3a456426614174000.png");
	});

	it("sanitizes persisted download file names before using them in headers", () => {
		expect(
			getDownloadFileName({
				key: "public/123e4567e89b12d3a456426614174000",
				fileName: '../"Quarterly\r\nReport".pdf',
			}),
		).toBe("Quarterly Report.pdf");
	});

	it("builds a safe attachment content disposition header", () => {
		expect(
			buildDownloadContentDisposition({
				key: "public/123e4567e89b12d3a456426614174000",
				fileName: '../"Quarterly\r\nReport".pdf',
			}),
		).toBe('attachment; filename="Quarterly Report.pdf"');
	});
});
