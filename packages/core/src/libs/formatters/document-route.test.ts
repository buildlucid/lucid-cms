import { describe, expect, test } from "vitest";
import type { InternalDocumentField } from "../../exports/types.js";
import defineCollection from "../collection/define-collection.js";
import field from "../collection/definitions/fields/field.js";
import formatDocumentRoute from "./document-route.js";

const collection = defineCollection({
	key: "pages",
	mode: "multiple",
	details: {
		labels: {
			singular: "Page",
			plural: "Pages",
		},
	},
	localized: true,
	routing: { field: "path" },
	fields: [
		field.text("title", { useAsLabel: true }),
		field.text("path", { localized: true }),
	],
});

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
				key: "path",
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
						key: "path",
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
						key: "path",
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
		const selectCollection = defineCollection({
			key: "articles",
			mode: "multiple",
			details: {
				labels: {
					singular: "Article",
					plural: "Articles",
				},
			},
			routing: { field: "path" },
			fields: [
				field.select("status", {
					useAsLabel: true,
					options: [{ label: "In review", value: "review" }],
				}),
				field.text("path"),
			],
		});

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
