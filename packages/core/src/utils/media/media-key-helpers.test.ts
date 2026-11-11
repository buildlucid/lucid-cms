import crypto from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import buildDownloadContentDisposition from "./build-download-content-disposition.js";
import changeKeyVisibility from "./change-key-visibility.js";
import createMediaUrl from "./create-media-url.js";
import formatMediaPath from "./format-media-path.js";
import generateKey from "./generate-key.js";
import generateProcessKey from "./generate-process-key.js";
import getDownloadFileName from "./get-download-file-name.js";
import { getMediaKeyParts } from "./media-key-parts.js";
import normalizeMediaKey from "./normalize-media-key.js";

describe("media key helpers", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.for([
		{ key: "public/abc", visibility: "private", moved: "private/abc" },
		{ key: "private/abc", visibility: "private", moved: "private/abc" },
	] as const)("moves $key to $moved", ({ key, visibility, moved }) => {
		expect(changeKeyVisibility({ key, visibility })).toBe(moved);
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

	it("serves media at its uid with a readable file name", () => {
		expect(
			formatMediaPath({
				uid: "123e4567-e89b-12d3-a456-426614174000",
				fileName: "Screenshot 2026-02-13 at 10.png",
				extension: "png",
			}),
		).toBe(
			"123e4567-e89b-12d3-a456-426614174000/screenshot-2026-02-13-at-10.png",
		);
	});

	it("serves media at its uid alone when it has no file name", () => {
		expect(
			formatMediaPath({
				uid: "123e4567-e89b-12d3-a456-426614174000",
				fileName: null,
			}),
		).toBe("123e4567-e89b-12d3-a456-426614174000");
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

	it("parses media key parts", () => {
		expect(
			getMediaKeyParts(
				"public/123e4567e89b12d3a456426614174000/screenshot-2026-02-13-at-10",
			),
		).toMatchObject({
			visibility: "public",
			identity: "123e4567e89b12d3a456426614174000",
			isProcessed: false,
		});
		expect(
			getMediaKeyParts(
				"public/processed/123e4567e89b12d3a456426614174000-w400-fwebp",
			),
		).toMatchObject({
			visibility: "public",
			identity: "123e4567e89b12d3a456426614174000-w400-fwebp",
			isProcessed: true,
		});
	});

	it("generates processed image keys", () => {
		expect(
			generateProcessKey({
				key: "public/123e4567e89b12d3a456426614174000",
				options: {
					width: 400,
					format: "webp",
				},
				extension: "png",
			}),
		).toBe("public/processed/123e4567e89b12d3a456426614174000-w400-fwebp");
	});

	it("includes non-zero rotation in processed image keys", () => {
		expect(
			generateProcessKey({
				key: "public/123e4567e89b12d3a456426614174000",
				options: {
					rotate: 90,
					format: "webp",
				},
				extension: "png",
			}),
		).toBe("public/processed/123e4567e89b12d3a456426614174000-r90-fwebp");

		expect(
			generateProcessKey({
				key: "public/123e4567e89b12d3a456426614174000",
				options: {
					rotate: 0,
					format: "webp",
				},
				extension: "png",
			}),
		).toBe("public/processed/123e4567e89b12d3a456426614174000-fwebp");
	});

	it("creates media URLs from the uid, with the query that picks a variant", () => {
		expect(
			createMediaUrl({
				host: "https://example.com",
				uid: "123e4567-e89b-12d3-a456-426614174000",
				fileName: "Screenshot 2026-02-13 at 10.png",
				extension: "webp",
				query: {
					preset: "thumbnail-small",
					format: "webp",
				},
			}),
		).toBe(
			"https://example.com/cdn/123e4567-e89b-12d3-a456-426614174000/screenshot-2026-02-13-at-10.webp?preset=thumbnail-small&format=webp",
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
