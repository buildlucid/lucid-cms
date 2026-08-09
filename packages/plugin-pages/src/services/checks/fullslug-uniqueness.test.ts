import { copy } from "@lucidcms/core/plugin";
import { describe, expect, test } from "vitest";
import type { CollectionConfig, ProjectedFullSlug } from "../../types/types.js";
import {
	buildRouteUniquenessItems,
	findExistingRouteCollisions,
	findProjectedRouteDuplicates,
} from "../../utils/route-uniqueness.js";
import checkFullSlugUniqueness from "./fullslug-uniqueness.js";

const buildItems = (projectedFullSlugs: ProjectedFullSlug[]) =>
	buildRouteUniquenessItems({
		projectedFullSlugs,
	});

const collection = {
	key: "pages",
	localized: false,
	segments: [],
	ui: {
		fullSlug: false,
		widths: { fullSlug: 12, slug: 12, parentPage: 12, segments: 12 },
	},
	unique: true,
} satisfies CollectionConfig;

describe("fullSlug route uniqueness", () => {
	test("detects projected collisions by complete route and locale", () => {
		const items = buildItems([
			{
				documentId: 1,
				versionId: 10,
				fullSlugs: { en: "/docs/v1/about" },
			},
			{
				documentId: 2,
				versionId: 20,
				fullSlugs: { en: "/docs/v1/about" },
			},
		]);

		expect(findProjectedRouteDuplicates(items)).toEqual([
			{ locale: "en", fullSlug: "/docs/v1/about" },
		]);
	});

	test("keeps routes in different segments independent", () => {
		const projectedItems = buildItems([
			{
				documentId: 1,
				versionId: 10,
				fullSlugs: { en: "/docs/v2/about" },
			},
		]);
		const existingItems = buildItems([
			{
				documentId: 2,
				versionId: 20,
				fullSlugs: { en: "/docs/v1/about" },
			},
		]);

		expect(
			findExistingRouteCollisions({ projectedItems, existingItems }),
		).toEqual([]);
	});

	test("normalizes paths before comparison", () => {
		const projectedItems = buildItems([
			{
				documentId: 1,
				versionId: 10,
				fullSlugs: { en: "/Docs/V1/About" },
			},
		]);
		const existingItems = buildItems([
			{
				documentId: 2,
				versionId: 20,
				fullSlugs: { en: "/docs/v1/about" },
			},
		]);

		expect(
			findExistingRouteCollisions({ projectedItems, existingItems }),
		).toEqual([{ locale: "en", fullSlug: "/docs/v1/about" }]);
	});

	test("keeps localized collisions scoped to their locale", () => {
		const projectedItems = buildItems([
			{
				documentId: 1,
				versionId: 10,
				fullSlugs: { en: "/about", fr: "/a-propos" },
			},
		]);
		const existingItems = buildItems([
			{
				documentId: 2,
				versionId: 20,
				fullSlugs: { en: "/different", fr: "/a-propos" },
			},
		]);

		expect(
			findExistingRouteCollisions({ projectedItems, existingItems }),
		).toEqual([{ locale: "fr", fullSlug: "/a-propos" }]);
	});

	test("uses the supplied message for projected collisions", async () => {
		const duplicateMessage = copy(
			"server:plugin.pages.full.slug.duplicate.on.delete",
		);
		const response = await checkFullSlugUniqueness({} as never, {
			collection,
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
			tables: {} as never,
			duplicateMessage,
		});

		expect(response.error).toMatchObject({
			message: duplicateMessage,
			errors: {
				fields: [{ key: "slug", localeCode: "en", message: duplicateMessage }],
			},
		});
	});

	test("allows route collisions when uniqueness is disabled", async () => {
		const response = await checkFullSlugUniqueness({} as never, {
			collection: { ...collection, unique: false },
			projectedFullSlugs: [
				{
					documentId: 1,
					versionId: 10,
					fullSlugs: { en: "/about" },
				},
			],
			versionType: "latest",
			collectionKey: "pages",
			tables: {} as never,
		});

		expect(response.error).toBeUndefined();
	});
});
