import { describe, expect, expectTypeOf, test } from "vitest";
import { asDocument } from "../../index.js";
import type {
	CollectionDocument,
	CollectionDocumentTranslations,
	DocumentBrick,
	DocumentBrickView,
	DocumentFieldGroupView,
	DocumentRef,
	DocumentView,
	RelationFieldValue,
} from "../../types.js";

declare module "../../types.js" {
	interface CollectionDocumentFieldsByCollection {
		page: {
			page_title: CollectionDocumentTranslations<string | null>;
			related_page: Array<RelationFieldValue<"page">>;
			hero_image: number[];
			authors: number[];
			custom_owner: number[];
			sections: Array<{
				heading: string | null;
			}>;
		};
	}

	interface CollectionDocumentBricksByCollection {
		page:
			| DocumentBrick<
					"banner",
					"builder",
					{
						title: CollectionDocumentTranslations<string | null>;
					}
			  >
			| DocumentBrick<
					"seo",
					"fixed",
					{
						canonical_url: string | null;
					}
			  >;
	}

	interface CollectionDocumentLocaleCodes {
		en: true;
		fr: true;
	}

	interface CollectionDocumentStatusesByCollection {
		page: "latest" | "revision" | "snapshot" | "published";
	}

	interface CollectionDocumentVersionKeysByCollection {
		page: "latest" | "published";
	}
}

const page = {
	id: 1,
	collectionKey: "page",
	status: "published",
	fields: {
		page_title: {
			en: "Homepage",
			fr: "Accueil",
		},
		related_page: [
			{
				id: 2,
				collectionKey: "page",
			},
			{
				id: 3,
				collectionKey: "page",
			},
		],
		hero_image: [10, 11],
		authors: [101, 100],
		custom_owner: [501],
		sections: [
			{
				heading: "Hero",
			},
			{
				heading: "Features",
			},
		],
	},
	bricks: [
		{
			id: 21,
			ref: "brick-banner",
			key: "banner",
			order: 2,
			type: "builder",
			fields: {
				title: {
					en: "Welcome in",
					fr: "Bienvenue",
				},
			},
		},
		{
			id: 22,
			ref: "brick-seo",
			key: "seo",
			order: 1,
			type: "fixed",
			fields: {
				canonical_url: "/",
			},
		},
		{
			id: 23,
			ref: "brick-banner-secondary",
			key: "banner",
			order: 1,
			type: "builder",
			fields: {
				title: {
					en: "Still reading?",
					fr: "Vous etes encore la ?",
				},
			},
		},
	],
	refs: {
		relation: [
			{
				id: 3,
				collectionKey: "page",
				fields: {
					page_title: "Contact",
				},
			},
			{
				id: 2,
				collectionKey: "page",
				fields: {
					page_title: "About",
				},
			},
		],
		media: [
			{
				id: 11,
				type: "image",
				folderId: null,
				origin: "human",
				title: [],
				alt: [],
				file: {
					key: "media/11.jpg",
					url: "/media/11.jpg",
					fileName: "hero-secondary.jpg",
					sourceType: "original",
					meta: {
						mimeType: "image/jpeg",
						extension: "jpg",
						fileSize: 111,
						width: 1200,
						height: 800,
						focalPoint: null,
						blurHash: null,
						averageColor: null,
						base64: null,
						isDark: null,
						isLight: null,
					},
				},
				public: true,
				isDeleted: false,
				isDeletedAt: null,
				deletedBy: null,
				createdAt: null,
				updatedAt: null,
			},
			{
				id: 10,
				type: "image",
				folderId: null,
				origin: "human",
				title: [],
				alt: [],
				file: {
					key: "media/10.jpg",
					url: "/media/10.jpg",
					fileName: "hero-primary.jpg",
					sourceType: "original",
					meta: {
						mimeType: "image/jpeg",
						extension: "jpg",
						fileSize: 110,
						width: 1600,
						height: 900,
						focalPoint: null,
						blurHash: null,
						averageColor: null,
						base64: null,
						isDark: null,
						isLight: null,
					},
				},
				public: true,
				isDeleted: false,
				isDeletedAt: null,
				deletedBy: null,
				createdAt: null,
				updatedAt: null,
			},
		],
		user: [
			{
				id: 100,
				username: "alice",
				email: "alice@example.com",
				firstName: "Alice",
				lastName: "A",
				profilePicture: null,
			},
			{
				id: 101,
				username: "bob",
				email: "bob@example.com",
				firstName: "Bob",
				lastName: "B",
				profilePicture: null,
			},
		],
		"custom-owner": [
			{
				id: 501,
				name: "Custom owner",
			},
		],
	},
	meta: {
		versionId: 9,
		version: {
			latest: {
				id: 11,
				promotedFrom: null,
				contentId: "page_home_latest",
				createdAt: "2026-04-22T12:00:00.000Z",
				createdBy: 1,
			},
			published: {
				id: 9,
				promotedFrom: null,
				contentId: "page_home_published",
				createdAt: "2026-04-20T12:00:00.000Z",
				createdBy: 1,
			},
		},
		createdBy: 1,
		createdAt: "2026-04-20T12:00:00.000Z",
		updatedAt: "2026-04-22T12:00:00.000Z",
		updatedBy: 1,
	},
} satisfies CollectionDocument<"page">;

describe("@lucidcms/client document helpers", () => {
	test("wraps a document with locale-aware field, brick, and group helpers", () => {
		const pageView = asDocument(page, {
			locale: "en",
		});

		expect(pageView.field("page_title").value()).toBe("Homepage");
		expect(pageView.field("related_page").ref("relation")?.id).toBe(2);
		expect(pageView.ref("relation", page.fields.related_page)?.id).toBe(2);
		expect(
			pageView
				.field("hero_image")
				.refs("media")
				.map((ref) => ref.id),
		).toEqual([10, 11]);
		expect(pageView.field("authors").ref("user")?.id).toBe(101);
		expect(pageView.field("custom_owner").refs("custom-owner")).toEqual([
			{
				id: 501,
				name: "Custom owner",
			},
		]);
		expect(pageView.brick("banner")?.field("title").value()).toBe(
			"Still reading?",
		);
		expect(
			pageView
				.brick({
					type: "builder",
					key: "banner",
				})
				?.field("title")
				.value(),
		).toBe("Still reading?");
		expect(
			pageView
				.brick({
					type: "fixed",
				})
				?.field("canonical_url")
				.value(),
		).toBe("/");
		expect(pageView.bricks("banner")).toHaveLength(2);
		expect(
			pageView
				.bricks({
					type: "builder",
				})
				.map((brick) => brick.id),
		).toEqual([23, 21]);
		expect(
			pageView.field("sections").groups()[0]?.field("heading").value(),
		).toBe("Hero");
		expect(
			pageView.field("sections").groups()[1]?.field("heading").value(),
		).toBe("Features");
	});

	test("returns translated field objects until a locale is supplied", () => {
		const pageView = asDocument(page);

		expect(pageView.field("page_title").value()).toEqual({
			en: "Homepage",
			fr: "Accueil",
		});
		expect(pageView.field("page_title").value({ locale: "fr" })).toBe(
			"Accueil",
		);
		expect(pageView.withLocale("en").field("page_title").value()).toBe(
			"Homepage",
		);
	});

	test("supports changing locale on document and brick wrappers", () => {
		const pageView = asDocument(page).withLocale("fr");
		const banner = pageView.brick({
			type: "builder",
			key: "banner",
		});

		expect(pageView.field("page_title").value()).toBe("Accueil");
		expect(banner?.field("title").value()).toBe("Vous etes encore la ?");
		expect(pageView.field("page_title").withLocale("en").value()).toBe(
			"Homepage",
		);
	});

	test("returns undefined for nullish documents and keeps optional chaining ergonomic", () => {
		const missingPage = asDocument(
			undefined as CollectionDocument<"page"> | undefined,
			{
				locale: "en",
			},
		);
		const emptyPage = asDocument(null);

		expect(missingPage).toBeUndefined();
		expect(emptyPage).toBeUndefined();
		expectTypeOf(missingPage).toEqualTypeOf<
			DocumentView<CollectionDocument<"page">, true> | undefined
		>();
		expectTypeOf(missingPage?.field("page_title").value()).toEqualTypeOf<
			string | null | undefined
		>();
	});

	test("preserves collection-aware helper types", () => {
		const pageView = asDocument(page, {
			locale: "en",
		});
		const rawPageView = asDocument(page);

		expectTypeOf(pageView).toEqualTypeOf<
			DocumentView<CollectionDocument<"page">, true>
		>();
		expectTypeOf(pageView.field("page_title").value()).toEqualTypeOf<
			string | null | undefined
		>();
		expectTypeOf(rawPageView).toEqualTypeOf<
			DocumentView<CollectionDocument<"page">, false>
		>();
		expectTypeOf(rawPageView.field("page_title").value()).toEqualTypeOf<
			CollectionDocumentTranslations<string | null>
		>();
		expectTypeOf(
			rawPageView.field("page_title").value({ locale: "en" }),
		).toEqualTypeOf<string | null | undefined>();
		expectTypeOf(pageView.field("related_page").refs("relation")).toEqualTypeOf<
			DocumentRef[]
		>();
		expectTypeOf(pageView.brick("banner")).toEqualTypeOf<
			| DocumentBrickView<
					CollectionDocument<"page">,
					DocumentBrick<
						"banner",
						"builder",
						{
							title: CollectionDocumentTranslations<string | null>;
						}
					>,
					true
			  >
			| undefined
		>();
		expectTypeOf(
			pageView.bricks({
				type: "builder",
			}),
		).toEqualTypeOf<
			Array<
				DocumentBrickView<
					CollectionDocument<"page">,
					DocumentBrick<
						"banner",
						"builder",
						{
							title: CollectionDocumentTranslations<string | null>;
						}
					>,
					true
				>
			>
		>();
		expectTypeOf(
			pageView.brick({
				type: "fixed",
			}),
		).toEqualTypeOf<
			| DocumentBrickView<
					CollectionDocument<"page">,
					DocumentBrick<
						"seo",
						"fixed",
						{
							canonical_url: string | null;
						}
					>,
					true
			  >
			| undefined
		>();
		expectTypeOf(pageView.field("sections").groups()).toEqualTypeOf<
			Array<
				DocumentFieldGroupView<
					CollectionDocument<"page">,
					{
						heading: string | null;
					},
					true
				>
			>
		>();
		expectTypeOf(
			pageView.field("sections").groups()[0]?.field("heading").value(),
		).toEqualTypeOf<string | null | undefined>();
	});
});
