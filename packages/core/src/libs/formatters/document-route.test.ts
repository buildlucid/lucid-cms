import { describe, expect, test } from "vitest";
import type { InternalDocumentField } from "../../types.js";
import CollectionBuilder from "../collection/builders/collection-builder/index.js";
import formatDocumentRoute from "./document-route.js";

const collection = new CollectionBuilder("pages", {
	mode: "multiple",
	details: {
		name: "Pages",
		singularName: "Page",
	},
	localized: true,
	routing: "fullSlug",
})
	.addText("title", { useAsLabel: true })
	.addText("fullSlug", { localized: true });

describe("formatDocumentRoute", () => {
	test("resolves localized paths and standard document labels", () => {
		const fields: InternalDocumentField[] = [
			{
				key: "title",
				type: "text",
				value: null,
				translations: { en: "About", fr: "À propos" },
			},
			{
				key: "fullSlug",
				type: "text",
				value: null,
				translations: { en: "/en/about", fr: "/fr/a-propos" },
			},
		];

		expect(
			formatDocumentRoute({
				collection,
				documentId: 42,
				fields,
				locales: ["en", "fr"],
			}),
		).toEqual({
			path: { en: "/en/about", fr: "/fr/a-propos" },
			label: { en: "About", fr: "À propos" },
		});
	});

	test("falls back to the collection label when the label field is empty", () => {
		expect(
			formatDocumentRoute({
				collection,
				documentId: 42,
				fields: [
					{
						key: "title",
						type: "text",
						value: null,
						translations: { en: null, fr: null },
					},
					{
						key: "fullSlug",
						type: "text",
						value: null,
						translations: { en: "/en/about", fr: null },
					},
				],
				locales: ["en", "fr"],
			}),
		).toEqual({
			path: { en: "/en/about", fr: null },
			label: { en: "Page #42", fr: "Page #42" },
		});
	});

	test("returns null when no route value is available", () => {
		expect(
			formatDocumentRoute({
				collection,
				documentId: 42,
				fields: [
					{
						key: "fullSlug",
						type: "text",
						value: null,
						translations: { en: null, fr: null },
					},
				],
				locales: ["en", "fr"],
			}),
		).toBeNull();
	});

	test("uses editor-facing select option labels", () => {
		const selectCollection = new CollectionBuilder("articles", {
			mode: "multiple",
			details: { name: "Articles", singularName: "Article" },
			routing: "path",
		})
			.addSelect("status", {
				useAsLabel: true,
				options: [{ label: "In review", value: "review" }],
			})
			.addText("path");

		expect(
			formatDocumentRoute({
				collection: selectCollection,
				documentId: 7,
				fields: [
					{ key: "status", type: "select", value: "review" },
					{ key: "path", type: "text", value: "/articles/review" },
				],
				locales: ["en"],
			}),
		).toEqual({ path: "/articles/review", label: "In review" });
	});
});
