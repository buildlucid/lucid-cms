import { describe, expect, it, vi } from "vitest";
import { applyStreamingHeaders } from "./streaming.js";

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

	it("sandboxes streamed SVG responses", () => {
		const headers = new Map<string, string>();
		const context = {
			header: vi.fn((key: string, value: string) => {
				headers.set(key, value);
			}),
		};

		applyStreamingHeaders(context as never, {
			key: "public/file.svg",
			contentType: "image/svg+xml; charset=utf-8",
			contentLength: 42,
		});

		expect(headers.get("Content-Security-Policy")).toBe(
			"sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:",
		);
	});
});
