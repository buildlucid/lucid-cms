import { describe, expect, test } from "vitest";
import type { ServiceContext } from "../../types.js";
import { normalizeEmailAttachments } from "./attachments";

const context = {
	config: {
		i18n: {
			translations: {},
			interface: {
				defaultLocale: "en",
			},
		},
	},
} as ServiceContext;

describe("normalizeEmailAttachments", () => {
	test("accepts valid URL attachments", () => {
		const res = normalizeEmailAttachments(context, [
			{
				type: "url",
				url: "https://example.com/invoice.pdf",
				filename: "invoice.pdf",
				contentType: "application/pdf",
			},
		]);

		expect(res.error).toBeUndefined();
		expect(res.data).toEqual([
			{
				type: "url",
				url: "https://example.com/invoice.pdf",
				filename: "invoice.pdf",
				contentType: "application/pdf",
				disposition: "attachment",
			},
		]);
	});

	test("accepts valid inline CID attachments", () => {
		const res = normalizeEmailAttachments(context, [
			{
				type: "url",
				url: "https://example.com/logo.png",
				filename: "logo.png",
				contentType: "image/png",
				disposition: "inline",
				contentId: "logo-image",
			},
		]);

		expect(res.error).toBeUndefined();
		expect(res.data?.[0]?.disposition).toBe("inline");
		expect(res.data?.[0]?.contentId).toBe("logo-image");
	});

	test("rejects non HTTP/S URLs", () => {
		const res = normalizeEmailAttachments(context, [
			{
				type: "url",
				url: "ftp://example.com/file.pdf",
				filename: "file.pdf",
			},
		]);

		expect(res.error?.type).toBe("validation");
	});

	test("rejects missing filenames", () => {
		const res = normalizeEmailAttachments(context, [
			{
				type: "url",
				url: "https://example.com/file.pdf",
				filename: "",
			},
		]);

		expect(res.error?.type).toBe("validation");
	});

	test("rejects unsafe filenames", () => {
		const res = normalizeEmailAttachments(context, [
			{
				type: "url",
				url: "https://example.com/file.pdf",
				filename: "../file.pdf",
			},
		]);

		expect(res.error?.type).toBe("validation");
	});

	test("rejects invalid content types", () => {
		const res = normalizeEmailAttachments(context, [
			{
				type: "url",
				url: "https://example.com/file.pdf",
				filename: "file.pdf",
				contentType: "pdf",
			},
		]);

		expect(res.error?.type).toBe("validation");
	});

	test("rejects inline attachments without content IDs", () => {
		const res = normalizeEmailAttachments(context, [
			{
				type: "url",
				url: "https://example.com/file.pdf",
				filename: "file.pdf",
				disposition: "inline",
			} as never,
		]);

		expect(res.error?.type).toBe("validation");
	});

	test("rejects attachment dispositions with content IDs", () => {
		const res = normalizeEmailAttachments(context, [
			{
				type: "url",
				url: "https://example.com/file.pdf",
				filename: "file.pdf",
				disposition: "attachment",
				contentId: "file-id",
			} as never,
		]);

		expect(res.error?.type).toBe("validation");
	});

	test("rejects invalid content IDs", () => {
		const res = normalizeEmailAttachments(context, [
			{
				type: "url",
				url: "https://example.com/file.pdf",
				filename: "file.pdf",
				disposition: "inline",
				contentId: "invalid id",
			},
		]);

		expect(res.error?.type).toBe("validation");
	});

	test("rejects duplicate content IDs", () => {
		const res = normalizeEmailAttachments(context, [
			{
				type: "url",
				url: "https://example.com/one.png",
				filename: "one.png",
				disposition: "inline",
				contentId: "logo",
			},
			{
				type: "url",
				url: "https://example.com/two.png",
				filename: "two.png",
				disposition: "inline",
				contentId: "logo",
			},
		]);

		expect(res.error?.type).toBe("validation");
	});

	test("rejects more than 10 attachments", () => {
		const res = normalizeEmailAttachments(
			context,
			Array.from({ length: 11 }, (_, index) => ({
				type: "url" as const,
				url: `https://example.com/${index}.pdf`,
				filename: `${index}.pdf`,
			})),
		);

		expect(res.error?.type).toBe("validation");
	});
});
