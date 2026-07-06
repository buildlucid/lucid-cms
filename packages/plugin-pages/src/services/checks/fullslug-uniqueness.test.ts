import { CollectionBuilder } from "@lucidcms/core";
import { copy } from "@lucidcms/core/plugin";
import { describe, expect, test } from "vitest";
import type { CollectionConfig, ProjectedFullSlug } from "../../types/types.js";
import {
	buildRouteUniquenessItems,
	findExistingRouteCollisions,
	findProjectedRouteDuplicates,
} from "../../utils/route-uniqueness.js";
import {
	getUniqueFields,
	getUniqueValuesFromFields,
	mergeRelationUniqueValueMaps,
	normalizeUniqueFieldValue,
	type RelationUniqueField,
	relationRowsToUniqueValueMap,
	rowToUniqueValues,
	type UniqueField,
} from "./fullslug-unique-fields.js";
import checkFullSlugUniqueness from "./fullslug-uniqueness.js";

const buildItems = (projectedFullSlugs: ProjectedFullSlug[]) =>
	buildRouteUniquenessItems({
		projectedFullSlugs,
		defaultLocale: "en",
	});

const uniqueMediaField = (overrides?: Partial<RelationUniqueField>) =>
	({
		key: "media",
		storage: "relation-table",
		fieldType: "media",
		table: "lucid_document__pages__fields__med__media",
		valueColumns: ["_media_id"],
		localized: false,
		...overrides,
	}) satisfies RelationUniqueField;

const uniqueUserField = (overrides?: Partial<RelationUniqueField>) =>
	({
		key: "owner",
		storage: "relation-table",
		fieldType: "user",
		table: "lucid_document__pages__fields__usr__owner",
		valueColumns: ["_user_id"],
		localized: false,
		...overrides,
	}) satisfies RelationUniqueField;

const uniqueRelationField = (overrides?: Partial<RelationUniqueField>) =>
	({
		key: "related",
		storage: "relation-table",
		fieldType: "relation",
		table: "lucid_document__pages__fields__rel__related",
		valueColumns: ["_collection_key", "_document_id"],
		localized: false,
		...overrides,
	}) satisfies RelationUniqueField;

describe("fullSlug route uniqueness", () => {
	test("detects root-parent fullSlug collisions against top-level routes", () => {
		const projectedItems = buildItems([
			{
				documentId: 1,
				versionId: 10,
				fullSlugs: { en: "/about" },
			},
		]);
		const existingItems = buildItems([
			{
				documentId: 2,
				versionId: 20,
				fullSlugs: { en: "/about" },
			},
		]);

		expect(
			findExistingRouteCollisions({ projectedItems, existingItems }),
		).toEqual([{ locale: "en", fullSlug: "/about" }]);
	});

	test("checks localized fullSlugs without relying on localized parent rows", () => {
		const projectedItems = buildItems([
			{
				documentId: 1,
				versionId: 10,
				fullSlugs: { en: "/about", fr: "/about" },
			},
		]);
		const existingItems = buildItems([
			{
				documentId: 2,
				versionId: 20,
				fullSlugs: { en: "/about", fr: "/about" },
			},
		]);

		expect(
			findExistingRouteCollisions({ projectedItems, existingItems }),
		).toEqual([
			{ locale: "en", fullSlug: "/about" },
			{ locale: "fr", fullSlug: "/about" },
		]);
	});

	test("blocks duplicate routes inside a projected descendant set", () => {
		const projectedItems = buildItems([
			{
				documentId: 1,
				versionId: 10,
				fullSlugs: { en: "/about" },
			},
			{
				documentId: 2,
				versionId: 20,
				fullSlugs: { en: "/about" },
			},
		]);

		expect(findProjectedRouteDuplicates(projectedItems)).toEqual([
			{ locale: "en", fullSlug: "/about" },
		]);
	});

	test("uses a custom duplicate message when supplied", async () => {
		const collection = {
			collectionKey: "pages",
			localized: false,
			displayFullSlug: false,
			unique: true,
		} satisfies CollectionConfig;
		const duplicateMessage = copy(
			"server:plugin.pages.full.slug.duplicate.on.delete",
		);

		const res = await checkFullSlugUniqueness(
			{
				config: {
					localization: {
						defaultLocale: "en",
						locales: [{ code: "en" }],
					},
					db: {
						config: {
							tableNameByteLimit: null,
						},
					},
				},
			} as never,
			{
				collection,
				collectionInstance: {} as never,
				projectedFullSlugs: [
					{
						documentId: 1,
						versionId: 10,
						fullSlugs: { en: "/about" },
					},
					{
						documentId: 2,
						versionId: 20,
						fullSlugs: { en: "/about" },
					},
				],
				versionType: "latest",
				collectionKey: "pages",
				tenantKey: null,
				tables: {} as never,
				duplicateMessage,
			},
		);

		expect(res.error?.message).toEqual(duplicateMessage);
		const fieldErrors = res.error?.errors?.fields;
		if (!Array.isArray(fieldErrors)) {
			throw new Error("Expected duplicate route field errors");
		}
		const [fieldError] = fieldErrors as Array<{ message: unknown }>;
		expect(fieldError?.message).toEqual(duplicateMessage);
	});

	test("unique false disables route uniqueness validation", async () => {
		const collection = {
			collectionKey: "pages",
			localized: false,
			displayFullSlug: false,
			unique: false,
		} satisfies CollectionConfig;

		const res = await checkFullSlugUniqueness({} as never, {
			collection,
			collectionInstance: {} as never,
			projectedFullSlugs: [
				{
					documentId: 1,
					versionId: 10,
					fullSlugs: { en: "/about" },
				},
			],
			versionType: "latest",
			collectionKey: "pages",
			tenantKey: null,
			tables: {} as never,
		});

		expect(res.error).toBeUndefined();
	});

	test("unique fields allow the same fullSlug for different field values", () => {
		const projectedItems = buildItems([
			{
				documentId: 1,
				versionId: 10,
				fullSlugs: { en: "/about" },
				uniqueValues: {
					en: { product: "cms", version: "v1" },
				},
			},
		]);

		const differentPartitionItems = buildItems([
			{
				documentId: 2,
				versionId: 20,
				fullSlugs: { en: "/about" },
				uniqueValues: {
					en: { product: "commerce", version: "v1" },
				},
			},
		]);
		const samePartitionItems = buildItems([
			{
				documentId: 3,
				versionId: 30,
				fullSlugs: { en: "/about" },
				uniqueValues: {
					en: { version: "v1", product: "cms" },
				},
			},
		]);

		expect(
			findExistingRouteCollisions({
				projectedItems,
				existingItems: differentPartitionItems,
			}),
		).toEqual([]);
		expect(
			findExistingRouteCollisions({
				projectedItems,
				existingItems: samePartitionItems,
			}),
		).toEqual([{ locale: "en", fullSlug: "/about" }]);
	});

	test("resolves relation-backed unique fields", () => {
		const collectionInstance = new CollectionBuilder("pages", {
			mode: "multiple",
			details: {
				name: copy("admin:tests.collections.pages.name", {
					defaultMessage: "Pages",
				}),
				singularName: copy("admin:tests.collections.pages.singularName", {
					defaultMessage: "Page",
				}),
			},
			localized: true,
		})
			.addText("product")
			.addMedia("media", {
				localized: true,
				multiple: true,
			})
			.addUser("owner")
			.addRelation("related", {
				collection: ["pages", "articles"],
				localized: true,
				multiple: true,
			});
		const collection = {
			collectionKey: "pages",
			localized: true,
			displayFullSlug: false,
			unique: {
				fields: ["product", "media", "owner", "related"],
			},
		} satisfies CollectionConfig;

		const res = getUniqueFields(collectionInstance, collection, null);

		expect(res.error).toBeUndefined();
		expect(res.data).toMatchObject([
			{
				key: "product",
				storage: "column",
				localized: true,
			},
			{
				key: "media",
				storage: "relation-table",
				fieldType: "media",
				localized: true,
			},
			{
				key: "owner",
				storage: "relation-table",
				fieldType: "user",
				localized: false,
			},
			{
				key: "related",
				storage: "relation-table",
				fieldType: "relation",
				localized: true,
			},
		]);
	});

	test("normalizes submitted relation-backed unique values by locale", () => {
		const uniqueFields: UniqueField[] = [
			uniqueMediaField(),
			uniqueUserField({ localized: true }),
			uniqueRelationField({ localized: true }),
		];

		const values = getUniqueValuesFromFields({
			fields: [
				{
					key: "media",
					type: "media",
					value: [2, 1],
				},
				{
					key: "owner",
					type: "user",
					translations: {
						en: [7, 3],
						fr: [5],
					},
				},
				{
					key: "related",
					type: "relation",
					translations: {
						en: [
							{ id: 2, collectionKey: "articles" },
							{ id: 1, collectionKey: "pages" },
						],
						fr: [{ id: 4, collectionKey: "articles" }],
					},
				},
			],
			localization: {
				defaultLocale: "en",
				locales: [
					{ code: "en", label: "English" },
					{ code: "fr", label: "French" },
				],
			},
			uniqueFields,
		});

		expect(values).toEqual({
			en: {
				media: [1, 2],
				owner: [3, 7],
				related: [
					{ collectionKey: "articles", id: 2 },
					{ collectionKey: "pages", id: 1 },
				],
			},
			fr: {
				media: [1, 2],
				owner: [5],
				related: [{ collectionKey: "articles", id: 4 }],
			},
		});
	});

	test("normalizes stored relation rows with localized and non-localized values", () => {
		const media = uniqueMediaField();
		const owner = uniqueUserField({ localized: true });
		const related = uniqueRelationField({ localized: true });
		const relationValues = mergeRelationUniqueValueMaps([
			relationRowsToUniqueValueMap({
				field: media,
				rows: [
					{
						document_version_id: 20,
						locale: "en",
						position: 1,
						_media_id: 2,
					},
					{
						document_version_id: 20,
						locale: "en",
						position: 0,
						_media_id: 1,
					},
				],
			}),
			relationRowsToUniqueValueMap({
				field: owner,
				rows: [
					{
						document_version_id: 20,
						locale: "fr",
						position: 0,
						_user_id: 9,
					},
				],
			}),
			relationRowsToUniqueValueMap({
				field: related,
				rows: [
					{
						document_version_id: 20,
						locale: "en",
						position: 0,
						_collection_key: "pages",
						_document_id: 4,
					},
					{
						document_version_id: 20,
						locale: "fr",
						position: 0,
						_collection_key: "articles",
						_document_id: 3,
					},
				],
			}),
		]);

		expect(
			rowToUniqueValues({
				row: {
					document_id: 2,
					document_version_id: 20,
					locale: "fr",
				},
				uniqueFields: [media, owner, related],
				relationValues,
				versionId: 20,
				localeCode: "fr",
				defaultLocale: "en",
			}),
		).toEqual({
			media: [1, 2],
			owner: [9],
			related: [{ collectionKey: "articles", id: 3 }],
		});
	});

	test("relation-backed unique values compare same and different route partitions", () => {
		const media = uniqueMediaField();
		const owner = uniqueUserField();
		const related = uniqueRelationField();
		const projectedItems = buildItems([
			{
				documentId: 1,
				versionId: 10,
				fullSlugs: { en: "/about" },
				uniqueValues: {
					en: {
						media: normalizeUniqueFieldValue(media, [2, 1]),
						owner: normalizeUniqueFieldValue(owner, [5]),
						related: normalizeUniqueFieldValue(related, [
							{ id: 2, collectionKey: "articles" },
							{ id: 1, collectionKey: "pages" },
						]),
					},
				},
			},
		]);
		const samePartitionItems = buildItems([
			{
				documentId: 2,
				versionId: 20,
				fullSlugs: { en: "/about" },
				uniqueValues: {
					en: {
						media: normalizeUniqueFieldValue(media, [1, 2]),
						owner: normalizeUniqueFieldValue(owner, [5]),
						related: normalizeUniqueFieldValue(related, [
							{ id: 1, collectionKey: "pages" },
							{ id: 2, collectionKey: "articles" },
						]),
					},
				},
			},
		]);
		const differentPartitionItems = buildItems([
			{
				documentId: 3,
				versionId: 30,
				fullSlugs: { en: "/about" },
				uniqueValues: {
					en: {
						media: normalizeUniqueFieldValue(media, [1, 3]),
						owner: normalizeUniqueFieldValue(owner, [5]),
						related: normalizeUniqueFieldValue(related, [
							{ id: 2, collectionKey: "articles" },
							{ id: 1, collectionKey: "pages" },
						]),
					},
				},
			},
		]);

		expect(
			findExistingRouteCollisions({
				projectedItems,
				existingItems: samePartitionItems,
			}),
		).toEqual([{ locale: "en", fullSlug: "/about" }]);
		expect(
			findExistingRouteCollisions({
				projectedItems,
				existingItems: differentPartitionItems,
			}),
		).toEqual([]);
	});
});
