import { describe, expect, it } from "vitest";
import { getLiveDocumentUrl } from "./live-document-url";

const published = {
	id: 1,
	promotedFrom: null,
	contentId: "content",
	createdAt: null,
	updatedAt: null,
	createdBy: null,
	createdByRunId: null,
};

const document = {
	isDeleted: false,
	route: { path: { en: "/about", fr: null }, label: "About" },
	versions: { latest: published, staging: published, production: null },
};

describe("getLiveDocumentUrl", () => {
	it("links the locale's path once the final environment is published", () => {
		const environments = [{ key: "staging" }, { key: "production" }];

		expect(
			getLiveDocumentUrl({
				siteUrl: "https://example.com/",
				environments,
				document: {
					...document,
					versions: { ...document.versions, production: published },
				},
				locale: "en",
			}),
		).toBe("https://example.com/about");
		expect(
			getLiveDocumentUrl({
				siteUrl: "https://example.com/",
				environments,
				document,
				locale: "en",
			}),
		).toBeNull();
	});

	it("uses latest when the collection has no environments", () => {
		expect(
			getLiveDocumentUrl({
				siteUrl: "https://example.com/",
				environments: [],
				document,
				locale: "en",
			}),
		).toBe("https://example.com/about");
	});

	it("skips locales without a path", () => {
		expect(
			getLiveDocumentUrl({
				siteUrl: "https://example.com/",
				environments: [],
				document,
				locale: "fr",
			}),
		).toBeNull();
	});
});
