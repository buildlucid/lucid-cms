import { describe, expect, it, vi } from "vitest";
import { applyRangeHeaders, applyStreamingHeaders } from "./streaming.js";

describe("streaming headers", () => {
	it("sets nosniff on streamed media responses", () => {
		const headers = new Map<string, string>();
		const context = {
			header: vi.fn((key: string, value: string) => {
				headers.set(key, value);
			}),
		};

		applyStreamingHeaders(context as never, {
			key: "public/file.png",
			contentType: "image/png",
			contentLength: 42,
		});

		expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(headers.get("Content-Disposition")).toBe(
			'inline; filename="public/file.png"',
		);
	});

	it.for([
		{ contentType: "image/svg+xml; charset=utf-8", sandboxed: true },
		{ contentType: "text/html", sandboxed: true },
		{ contentType: "application/xhtml+xml", sandboxed: true },
		{ contentType: undefined, sandboxed: true },
		{ contentType: "image/png", sandboxed: false },
		{ contentType: "video/mp4", sandboxed: false },
		{ contentType: "application/pdf", sandboxed: false },
	])(
		"sandboxes $contentType only if it can run script",
		({ contentType, sandboxed }) => {
			const headers = new Map<string, string>();
			const context = {
				header: vi.fn((key: string, value: string) => {
					headers.set(key, value);
				}),
			};

			applyStreamingHeaders(context as never, {
				key: "public/file",
				contentType,
				contentLength: 42,
			});

			expect(headers.get("Content-Security-Policy")).toBe(
				sandboxed
					? "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:"
					: undefined,
			);
		},
	);

	it("keeps the cache policy on partial responses", () => {
		const headers = new Map<string, string>();
		const context = {
			status: vi.fn(),
			header: vi.fn((key: string, value: string) => {
				headers.set(key, value);
			}),
		};

		applyRangeHeaders(context as never, {
			isPartial: true,
			range: { start: 0, end: 9 },
			totalSize: 100,
			cacheControl: "private, max-age=0, must-revalidate",
		});

		expect(context.status).toHaveBeenCalledWith(206);
		expect(headers.get("Cache-Control")).toBe(
			"private, max-age=0, must-revalidate",
		);
	});
});
