import { describe, expect, it } from "vitest";
import { applyCopies, isTransferEntry } from "./import-entries";

describe("applyCopies", () => {
	it("gives the entry and what it links to their copy uids", () => {
		const entry = applyCopies(
			"documents",
			{
				uid: "page",
				refs: { documents: { "pages:2": "about" }, media: { "4": "logo" } },
			},
			{ documents: { page: "page-copy", about: "about-copy" } },
		);

		expect(entry).toEqual({
			uid: "page-copy",
			refs: { documents: { "pages:2": "about-copy" }, media: { "4": "logo" } },
		});
	});
});

describe("isTransferEntry", () => {
	it("accepts entries with a uid and readable refs", () => {
		expect(isTransferEntry({ uid: "page" })).toBe(true);
		expect(
			isTransferEntry({ uid: "page", refs: { media: { "4": "logo" } } }),
		).toBe(true);
	});

	it("leaves malformed entries for the server to report", () => {
		expect(isTransferEntry({ uid: 4 })).toBe(false);
		expect(isTransferEntry({ uid: "page", refs: { media: { "4": 4 } } })).toBe(
			false,
		);
	});
});
