import { createServer } from "node:http";
import { decodePreviewFieldTarget } from "@lucidcms/preview-protocol";
import { describe, expect, expectTypeOf, test } from "vitest";
import {
	createClient,
	createDocumentView,
	createDocumentViews,
} from "../../index.js";
import type {
	CollectionDocument,
	CollectionDocumentTranslations,
	DocumentBrick,
	DocumentBrickView,
	DocumentFieldGroupView,
	DocumentView,
	Refs,
	RelationFieldValue,
} from "../../types.js";

declare module "../../types.js" {
	interface CollectionDocumentFieldsByCollection {
		page: {
			page_title: CollectionDocumentTranslations<string | null, "page">;
			related_page: Array<RelationFieldValue<"page">>;
			hero_image: number[];
			authors: number[];
			sections: Array<{
				heading: string | null;
				links: Array<{
					label: string | null;
				}>;
			}>;
		};
	}

	interface CollectionDocumentBricksByCollection {
		page:
			| DocumentBrick<
					"banner",
					"builder",
					{
						title: CollectionDocumentTranslations<string | null, "page">;
					}
			  >
			| DocumentBrick<
					"seo",
					"fixed",
					{
						canonical_url: string | null;
					}
			  >
			| DocumentBrick<
					"callout",
					"embedded",
					{
						text: string | null;
					}
			  >;
	}

	interface CollectionDocumentLocaleCodesByCollection {
		page: "en" | "fr";
	}

	interface CollectionDocumentVersionsByCollection {
		page: "latest" | "revision" | "snapshot" | "published";
	}

	interface CollectionDocumentVersionKeysByCollection {
		page: "latest" | "published";
	}
}

const pageFixture: CollectionDocument<"page"> & { refs: Refs } = {
	id: 1,
	collectionKey: "page",
	version: "published",
	route: null,
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
		sections: [
			{
				heading: "Hero",
				links: [{ label: "Start" }],
			},
			{
				heading: "Features",
				links: [{ label: "Explore" }],
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
		{
			id: 24,
			ref: "embedded-callout",
			key: "callout",
			order: 0,
			type: "embedded",
			fields: {
				text: "Inline callout",
			},
		},
	],
	refs: {
		documents: [
			{
				id: 3,
				collectionKey: "page",
				route: null,
				fields: {
					page_title: "Contact",
				},
			},
			{
				id: 2,
				collectionKey: "page",
				route: null,
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
				status: "ready",
				title: {},
				alt: {},
				key: "media/11.jpg",
				url: "/media/11.jpg",
				fileName: "hero-secondary.jpg",
				sourceType: "original",
				delivery: { adapter: "local", data: null, supportsPresetQuery: true },
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
				status: "ready",
				title: {},
				alt: {},
				key: "media/10.jpg",
				url: "/media/10.jpg",
				fileName: "hero-primary.jpg",
				sourceType: "original",
				delivery: { adapter: "local", data: null, supportsPresetQuery: true },
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
				public: true,
				isDeleted: false,
				isDeletedAt: null,
				deletedBy: null,
				createdAt: null,
				updatedAt: null,
			},
		],
		users: [
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
	meta: {
		versionId: 9,
		versions: {
			latest: {
				id: 11,
				promotedFrom: null,
				contentId: "page_home_latest",
				createdAt: "2026-04-22T12:00:00.000Z",
				updatedAt: "2026-04-22T12:00:00.000Z",
				createdBy: 1,
			},
			published: {
				id: 9,
				promotedFrom: null,
				contentId: "page_home_published",
				createdAt: "2026-04-20T12:00:00.000Z",
				updatedAt: "2026-04-20T12:00:00.000Z",
				createdBy: 1,
			},
		},
		createdBy: 1,
		createdAt: "2026-04-20T12:00:00.000Z",
		updatedAt: "2026-04-22T12:00:00.000Z",
		updatedBy: 1,
	},
};
const { refs, ...rawPage } = pageFixture;
const page: CollectionDocument<"page"> = rawPage;

describe("@lucidcms/client document helpers", () => {
	test("creates document views from HTTP results while preserving refs and metadata", async () => {
		const links = { first: null, last: null, next: null, prev: null };
		const meta = {
			links: [],
			path: "/lucid/api/v1/content/documents/page",
			currentPage: 1,
			lastPage: 1,
			perPage: 10,
			total: 1,
		};
		const server = createServer((request, response) => {
			response.setHeader("content-type", "application/json");
			response.setHeader("x-request-id", "document-views");
			response.end(
				JSON.stringify({
					data: request.url?.includes("/documents/") ? [page] : page,
					refs,
					links,
					meta,
				}),
			);
		});
		await new Promise<void>((resolve, reject) => {
			server.once("error", reject);
			server.listen(0, "127.0.0.1", resolve);
		});
		try {
			const address = server.address();
			if (!address || typeof address === "string") {
				throw new Error("The test server did not bind to a TCP port.");
			}
			const client = createClient({
				baseUrl: `http://127.0.0.1:${address.port}`,
				auth: { type: "apiKey", apiKey: "test-key" },
			});
			const single = await client.documents.getSingle({
				collectionKey: "page",
				version: "latest",
			});
			const multiple = await client.documents.getMultiple({
				collectionKey: "page",
				version: "latest",
			});
			if (single.error) throw single.error;
			if (multiple.error) throw multiple.error;

			const view = createDocumentView({
				document: single.data,
				refs: single.refs,
				locale: "en",
			});
			const views = createDocumentViews({
				documents: multiple.data,
				refs: multiple.refs,
				locale: "fr",
			});
			expect(view.field("page_title").value()).toBe("Homepage");
			expect(views[0]?.field("page_title").value()).toBe("Accueil");
			expect(view.field("related_page").ref("documents")?.id).toBe(2);
			expect(
				views[0]
					?.field("hero_image")
					.refs("media")
					.map((ref) => ref.id),
			).toEqual([10, 11]);
			expect(view.raw.meta).toEqual(page.meta);
			for (const result of [single, multiple]) {
				expect(result.meta).toEqual(meta);
				expect(result.links).toEqual(links);
				expect(result.refs).toEqual(refs);
				expect(result.response.status).toBe(200);
				expect(result.response.headers.get("x-request-id")).toBe(
					"document-views",
				);
			}
		} finally {
			await new Promise<void>((resolve, reject) =>
				server.close((error) => (error ? reject(error) : resolve())),
			);
		}
	});

	test("wraps a document with locale-aware field, brick, and group helpers", () => {
		const pageView = createDocumentView({
			document: page,
			locale: "en",
			refs,
		});

		expect(pageView.field("page_title").value()).toBe("Homepage");
		expect(pageView.field("related_page").ref("documents")?.id).toBe(2);
		expect(pageView.ref("documents", page.fields.related_page)?.id).toBe(2);
		expect(
			pageView
				.field("hero_image")
				.refs("media")
				.map((ref) => ref.id),
		).toEqual([10, 11]);
		expect(pageView.field("authors").ref("users")?.id).toBe(101);
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
		const pageView = createDocumentView({ document: page });

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
		const pageView = createDocumentView({ document: page }).withLocale("fr");
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

	test("emits preview targets only when explicitly enabled", () => {
		expect(
			createDocumentView({ document: page }).field("page_title").preview(),
		).toEqual({});
		expect(
			createDocumentView({ document: page, preview: false })
				.field("page_title")
				.preview(),
		).toEqual({});

		const pageView = createDocumentView({
			document: page,
			preview: true,
		}).withLocale("fr");
		const rootAttributes = pageView.field("page_title").preview();
		const brickAttributes = pageView
			.brick({ type: "fixed" })
			?.field("canonical_url")
			.preview();
		const builderBrickAttributes = pageView
			.brick({ type: "builder", key: "banner" })
			?.field("title")
			.preview();
		const embeddedBrickAttributes = pageView
			.brick({ type: "embedded", key: "callout" })
			?.field("text")
			.preview();
		const groupAttributes = pageView
			.field("sections")
			.groups()[1]
			?.field("heading")
			.preview();
		const nestedGroupAttributes = createDocumentView({
			document: page,
			preview: true,
		})
			.field("sections")
			.groups()[1]
			?.field("links")
			.groups()[0]
			?.field("label")
			.withLocale("en")
			.preview();

		expect(
			decodePreviewFieldTarget(
				rootAttributes["data-lucid-preview-field"] ?? "",
			),
		).toEqual({
			collectionKey: "page",
			documentId: 1,
			path: ["page_title"],
			locale: "fr",
		});
		expect(embeddedBrickAttributes).toEqual({});
		expect(
			decodePreviewFieldTarget(
				brickAttributes?.["data-lucid-preview-field"] ?? "",
			),
		).toEqual({
			collectionKey: "page",
			documentId: 1,
			brick: { type: "fixed", key: "seo", order: 1 },
			path: ["canonical_url"],
			locale: "fr",
		});
		expect(
			decodePreviewFieldTarget(
				builderBrickAttributes?.["data-lucid-preview-field"] ?? "",
			),
		).toEqual({
			collectionKey: "page",
			documentId: 1,
			brick: { type: "builder", key: "banner", order: 1 },
			path: ["title"],
			locale: "fr",
		});
		expect(
			decodePreviewFieldTarget(
				groupAttributes?.["data-lucid-preview-field"] ?? "",
			),
		).toEqual({
			collectionKey: "page",
			documentId: 1,
			path: ["sections", 1, "heading"],
			locale: "fr",
		});
		expect(
			decodePreviewFieldTarget(
				nestedGroupAttributes?.["data-lucid-preview-field"] ?? "",
			),
		).toEqual({
			collectionKey: "page",
			documentId: 1,
			path: ["sections", 1, "links", 0, "label"],
			locale: "en",
		});
	});

	test("returns undefined for nullish documents and keeps optional chaining ergonomic", () => {
		const missingPage = createDocumentView({
			document: undefined as CollectionDocument<"page"> | undefined,
			locale: "en",
		});
		const emptyPage = createDocumentView({ document: null });

		expect(missingPage).toBeUndefined();
		expect(emptyPage).toBeUndefined();
		expectTypeOf(missingPage).toEqualTypeOf<
			DocumentView<CollectionDocument<"page">, true> | undefined
		>();
		expectTypeOf(missingPage?.field("page_title").value()).toEqualTypeOf<
			string | null | undefined
		>();
	});

	test("wraps multiple documents with the same locale-aware helpers", () => {
		const pages = createDocumentViews({
			documents: [page, { ...page, id: 2 }],
			locale: "fr",
		});
		const rawPages = createDocumentViews({ documents: [page] });

		expect(pages.map((pageView) => pageView.id)).toEqual([1, 2]);
		expect(
			pages.map((pageView) => pageView.field("page_title").value()),
		).toEqual(["Accueil", "Accueil"]);
		expect(
			createDocumentViews<CollectionDocument<"page">>({
				documents: [],
				locale: "en",
			}),
		).toEqual([]);
		expectTypeOf(pages).toEqualTypeOf<
			Array<DocumentView<CollectionDocument<"page">, true>>
		>();
		expectTypeOf(rawPages).toEqualTypeOf<
			Array<DocumentView<CollectionDocument<"page">, false>>
		>();
	});

	test("preserves collection-aware helper types", () => {
		const pageView = createDocumentView({
			document: page,
			locale: "en",
			refs,
		});
		const rawPageView = createDocumentView({ document: page });

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
			CollectionDocumentTranslations<string | null, "page">
		>();
		expectTypeOf(
			rawPageView.field("page_title").value({ locale: "en" }),
		).toEqualTypeOf<string | null | undefined>();
		expectTypeOf(
			pageView.field("related_page").refs("documents"),
		).toEqualTypeOf<NonNullable<Refs["documents"]>>();
		expectTypeOf(pageView.brick("banner")).toEqualTypeOf<
			| DocumentBrickView<
					CollectionDocument<"page">,
					DocumentBrick<
						"banner",
						"builder",
						{
							title: CollectionDocumentTranslations<string | null, "page">;
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
							title: CollectionDocumentTranslations<string | null, "page">;
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
					CollectionDocument<"page">["fields"]["sections"][number],
					true
				>
			>
		>();
		expectTypeOf(
			pageView.field("sections").groups()[0]?.field("heading").value(),
		).toEqualTypeOf<string | null | undefined>();
	});
});
