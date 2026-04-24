import { describe, expect, expectTypeOf, test } from "vitest";
import {
	asDocument,
	getBrick,
	getBricks,
	getFieldGroups,
	getFieldRef,
	getFieldRefs,
	getFieldValue,
} from "../../index.js";
import type {
	CollectionDocument,
	DocumentBrick,
	DocumentBrickView,
	DocumentFieldGroupView,
	DocumentRef,
	DocumentRelationValue,
	DocumentView,
	GroupDocumentField,
	TranslatedDocumentField,
	ValueDocumentField,
} from "../../types.js";

declare module "../../types.js" {
	interface CollectionDocumentFieldsByCollection {
		page: {
			page_title: TranslatedDocumentField<"page_title", "text", string | null>;
			related_page: ValueDocumentField<
				"related_page",
				"document",
				Array<DocumentRelationValue<"page">>
			>;
			hero_image: ValueDocumentField<"hero_image", "media", number[]>;
			authors: ValueDocumentField<"authors", "user", number[]>;
			sections: GroupDocumentField<
				"sections",
				"repeater",
				{
					heading: ValueDocumentField<"heading", "text", string | null, true>;
				}
			>;
		};
	}

	interface CollectionDocumentBricksByCollection {
		page:
			| DocumentBrick<
					"banner",
					"builder",
					{
						title: TranslatedDocumentField<"title", "text", string | null>;
					}
			  >
			| DocumentBrick<
					"seo",
					"fixed",
					{
						canonical_url: ValueDocumentField<
							"canonical_url",
							"text",
							string | null
						>;
					}
			  >;
	}

	interface CollectionDocumentLocaleCodes {
		en: true;
		fr: true;
	}

	interface CollectionDocumentStatusesByCollection {
		page: "latest" | "revision" | "published";
	}

	interface CollectionDocumentVersionKeysByCollection {
		page: "latest" | "published";
	}
}

const page = {
	id: 1,
	collectionKey: "page",
	status: "published",
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
	createdBy: null,
	createdAt: "2026-04-20T12:00:00.000Z",
	updatedAt: "2026-04-22T12:00:00.000Z",
	updatedBy: null,
	fields: {
		page_title: {
			key: "page_title",
			type: "text",
			translations: {
				en: "Homepage",
				fr: "Accueil",
			},
		},
		related_page: {
			key: "related_page",
			type: "document",
			value: [
				{
					id: 2,
					collectionKey: "page",
				},
				{
					id: 3,
					collectionKey: "page",
				},
			],
		},
		hero_image: {
			key: "hero_image",
			type: "media",
			value: [10, 11],
		},
		authors: {
			key: "authors",
			type: "user",
			value: [101, 100],
		},
		sections: {
			key: "sections",
			type: "repeater",
			groups: [
				{
					ref: "section-1",
					order: 0,
					open: true,
					fields: {
						heading: {
							key: "heading",
							type: "text",
							groupRef: "section-1",
							value: "Hero",
						},
					},
				},
				{
					ref: "section-2",
					order: 1,
					open: false,
					fields: {
						heading: {
							key: "heading",
							type: "text",
							groupRef: "section-2",
							value: "Features",
						},
					},
				},
			],
		},
	},
	bricks: [
		{
			id: 21,
			ref: "brick-banner",
			key: "banner",
			order: 2,
			open: true,
			type: "builder",
			fields: {
				title: {
					key: "title",
					type: "text",
					translations: {
						en: "Welcome in",
						fr: "Bienvenue",
					},
				},
			},
		},
		{
			id: 22,
			ref: "brick-seo",
			key: "seo",
			order: 1,
			open: false,
			type: "fixed",
			fields: {
				canonical_url: {
					key: "canonical_url",
					type: "text",
					value: "/",
				},
			},
		},
		{
			id: 23,
			ref: "brick-banner-secondary",
			key: "banner",
			order: 1,
			open: false,
			type: "builder",
			fields: {
				title: {
					key: "title",
					type: "text",
					translations: {
						en: "Still reading?",
						fr: "Vous etes encore la ?",
					},
				},
			},
		},
	],
	refs: {
		document: [
			{
				id: 3,
				collectionKey: "page",
				fields: {
					page_title: {
						key: "page_title",
						type: "text",
						value: "Contact",
					},
				},
			},
			{
				id: 2,
				collectionKey: "page",
				fields: {
					page_title: {
						key: "page_title",
						type: "text",
						value: "About",
					},
				},
			},
		],
		media: [
			{
				id: 11,
				url: "/media/11.jpg",
				key: "media/11.jpg",
				fileName: "hero-secondary.jpg",
				mimeType: "image/jpeg",
				extension: "jpg",
				fileSize: 111,
				width: 1200,
				height: 800,
				blurHash: null,
				averageColor: null,
				isDark: null,
				isLight: null,
				title: {
					en: "Secondary hero",
				},
				alt: {
					en: "Secondary image",
				},
				type: "image",
				isDeleted: false,
				public: true,
			},
			{
				id: 10,
				url: "/media/10.jpg",
				key: "media/10.jpg",
				fileName: "hero-primary.jpg",
				mimeType: "image/jpeg",
				extension: "jpg",
				fileSize: 110,
				width: 1600,
				height: 900,
				blurHash: null,
				averageColor: null,
				isDark: null,
				isLight: null,
				title: {
					en: "Primary hero",
				},
				alt: {
					en: "Primary image",
				},
				type: "image",
				isDeleted: false,
				public: true,
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
	},
} satisfies CollectionDocument<"page">;

describe("@lucidcms/client document helpers", () => {
	test("reads field values, groups, refs, and bricks from raw document data", () => {
		expect(getFieldValue(page.fields.page_title, { locale: "en" })).toBe(
			"Homepage",
		);
		expect(
			getFieldRefs(page, page.fields.related_page).map((ref) => ref.id),
		).toEqual([2, 3]);
		expect(getFieldRef(page, page.fields.hero_image)?.id).toBe(10);
		expect(getFieldRef(page, page.fields.authors)?.id).toBe(101);
		expect(
			getFieldGroups(page.fields.sections).map((group) => group.ref),
		).toEqual(["section-1", "section-2"]);
		expect(getBricks(page).map((brick) => brick.id)).toEqual([22, 23, 21]);
		expect(getBricks(page, "banner").map((brick) => brick.id)).toEqual([
			23, 21,
		]);
		expect(
			getBricks(page, {
				type: "builder",
			}).map((brick) => brick.id),
		).toEqual([23, 21]);
		expect(
			getBricks(page, {
				type: "builder",
				key: "banner",
			}).map((brick) => brick.id),
		).toEqual([23, 21]);
		expect(
			getBricks(page, {
				type: "fixed",
			}).map((brick) => brick.id),
		).toEqual([22]);
		expect(getBrick(page, "banner")?.id).toBe(23);
		expect(getBrick(page, "seo")?.fields.canonical_url.value).toBe("/");
		expect(
			getBrick(page, {
				type: "fixed",
			})?.fields.canonical_url.value,
		).toBe("/");
	});

	test("wraps a document with locale-aware field, brick, and group helpers", () => {
		const pageView = asDocument(page, {
			locale: "en",
		});

		expect(pageView.field("page_title").value()).toBe("Homepage");
		expect(pageView.field("related_page").ref()?.id).toBe(2);
		expect(
			pageView
				.field("hero_image")
				.refs()
				.map((ref) => ref.id),
		).toEqual([10, 11]);
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
			DocumentView<CollectionDocument<"page">> | undefined
		>();
		expectTypeOf(missingPage?.field("page_title").value()).toEqualTypeOf<
			string | null | undefined
		>();
	});

	test("preserves collection-aware helper types", () => {
		const pageView = asDocument(page, {
			locale: "en",
		});

		expectTypeOf(getFieldRefs(page, page.fields.related_page)).toEqualTypeOf<
			Array<DocumentRef<"page">>
		>();
		expectTypeOf(getBricks(page, "banner")).toEqualTypeOf<
			Array<
				DocumentBrick<
					"banner",
					"builder",
					{
						title: TranslatedDocumentField<"title", "text", string | null>;
					}
				>
			>
		>();
		expectTypeOf(
			getBricks(page, {
				type: "builder",
			}),
		).toEqualTypeOf<
			Array<
				DocumentBrick<
					"banner",
					"builder",
					{
						title: TranslatedDocumentField<"title", "text", string | null>;
					}
				>
			>
		>();
		expectTypeOf(
			getBrick(page, {
				type: "fixed",
			}),
		).toEqualTypeOf<
			| DocumentBrick<
					"seo",
					"fixed",
					{
						canonical_url: ValueDocumentField<
							"canonical_url",
							"text",
							string | null
						>;
					}
			  >
			| undefined
		>();
		expectTypeOf(pageView).toEqualTypeOf<
			DocumentView<CollectionDocument<"page">>
		>();
		expectTypeOf(pageView.field("page_title").value()).toEqualTypeOf<
			string | null | undefined
		>();
		expectTypeOf(pageView.field("related_page").refs()).toEqualTypeOf<
			Array<DocumentRef<"page">>
		>();
		expectTypeOf(pageView.brick("banner")).toEqualTypeOf<
			| DocumentBrickView<
					CollectionDocument<"page">,
					DocumentBrick<
						"banner",
						"builder",
						{
							title: TranslatedDocumentField<"title", "text", string | null>;
						}
					>
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
							title: TranslatedDocumentField<"title", "text", string | null>;
						}
					>
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
							canonical_url: ValueDocumentField<
								"canonical_url",
								"text",
								string | null
							>;
						}
					>
			  >
			| undefined
		>();
		expectTypeOf(pageView.field("sections").groups()).toEqualTypeOf<
			Array<
				DocumentFieldGroupView<
					CollectionDocument<"page">,
					{
						heading: ValueDocumentField<"heading", "text", string | null, true>;
					}
				>
			>
		>();
		expectTypeOf(
			pageView.field("sections").groups()[0]?.field("heading").value(),
		).toEqualTypeOf<string | null | undefined>();
	});
});
