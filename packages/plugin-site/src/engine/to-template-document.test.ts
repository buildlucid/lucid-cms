import { describe, expect, test } from "vitest";
import toTemplateDocument from "./to-template-document.js";

const locales = new Set(["en", "fr"]);

const document = {
	id: 7,
	collectionKey: "page",
	version: null,
	route: {
		path: { en: "/en/about", fr: "/fr/a-propos" },
		label: { en: "About", fr: "À propos" },
	},
	fields: {
		title: { en: "About", fr: "À propos" },
		summary: { en: "English only" },
		views: 12,
		links: [
			{ label: { en: "Home", fr: "Accueil" }, url: "/" },
			{ label: { en: "Blog", fr: "Blog" }, url: "/blog" },
		],
		related: [{ id: 3, collectionKey: "page" }],
	},
	bricks: [
		{
			ref: "b1",
			id: 1,
			key: "banner",
			order: 0,
			type: "builder" as const,
			fields: { heading: { en: "Hello", fr: "Bonjour" } },
		},
		{
			ref: "b2",
			id: 2,
			key: "seo",
			order: 0,
			type: "fixed" as const,
			fields: { title: "SEO title" },
		},
	],
	meta: {
		versionId: 41,
		versions: {},
		createdAt: null,
		updatedAt: "2026-10-17T10:00:00.000Z",
		createdBy: null,
		updatedBy: null,
		createdByRunId: null,
		updatedByRunId: null,
	},
};

describe("toTemplateDocument", () => {
	test("resolves fields, repeater groups and the url for the locale", () => {
		const page = toTemplateDocument(document, "fr", locales);

		expect(page).toMatchObject({
			id: 7,
			locale: "fr",
			url: "/fr/a-propos",
			updatedAt: "2026-10-17T10:00:00.000Z",
			versionId: 41,
			fields: {
				title: "À propos",
				views: 12,
				links: [
					{ label: "Accueil", url: "/" },
					{ label: "Blog", url: "/blog" },
				],
				related: [{ id: 3, collectionKey: "page" }],
			},
		});
	});

	test("gives null for a translation the locale doesn't have", () => {
		expect(toTemplateDocument(document, "fr", locales).fields.summary).toBe(
			null,
		);
	});

	test("lists builder bricks and keys fixed bricks by their key", () => {
		const page = toTemplateDocument(document, "fr", locales);

		expect(page.bricks).toEqual([
			{ id: 1, key: "banner", fields: { heading: "Bonjour" } },
		]);
		expect(page.fixed).toEqual({
			seo: { id: 2, key: "seo", fields: { title: "SEO title" } },
		});
	});
});
