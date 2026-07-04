import type {
	CollectionDocument as CoreCollectionDocument,
	CollectionDocumentTranslations as CoreCollectionDocumentTranslations,
	DocumentBrick as CoreDocumentBrick,
	RelationFieldValue as CoreRelationFieldValue,
} from "@lucidcms/core/types";
import { expectTypeOf, test } from "vitest";
import { asDocument, createClient } from "./index.js";
import { createDocumentsClient } from "./resources/documents.js";
import type {
	CollectionDocument,
	CollectionDocumentFilters,
	CollectionDocumentKey,
	CollectionDocumentLocaleCode,
	CollectionDocumentSortKey,
	CollectionDocumentStatus,
	CollectionDocumentTranslations,
	CollectionDocumentVersionKey,
	DocumentBrick,
	DocumentMultipleInclude,
	DocumentSingleInclude,
	DocumentsGetMultipleQuery,
	DocumentsGetMultipleResponse,
	DocumentsGetSingleQuery,
	DocumentsGetSingleResponse,
	LucidClient,
	LucidClientResponse,
	RelationFieldValue,
} from "./types.js";

declare module "./types.js" {
	interface CollectionDocumentFieldsByCollection {
		page: {
			page_title: CollectionDocumentTranslations<string | null>;
			related_page: Array<RelationFieldValue<"page">>;
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

	interface CollectionDocumentFiltersByCollection {
		page: {
			id?: {
				value: number;
			};
			_fullSlug?: {
				value: string;
			};
			fields?: {
				sections?: {
					_heading?: {
						value: string;
					};
				};
			};
			banner?: {
				_title?: {
					value: string;
				};
			};
		};
	}

	interface CollectionDocumentSortsByCollection {
		page: "createdAt" | "updatedAt";
	}

	interface CollectionDocumentStatusesByCollection {
		page: "latest" | "revision" | "published";
	}

	interface CollectionDocumentVersionKeysByCollection {
		page: "latest" | "published";
	}
}

declare module "@lucidcms/core/types" {
	interface CollectionDocumentFieldsByCollection {
		page: {
			page_title: CoreCollectionDocumentTranslations<string | null>;
			related_page: Array<CoreRelationFieldValue<"page">>;
			sections: Array<{
				heading: string | null;
			}>;
		};
	}

	interface CollectionDocumentBricksByCollection {
		page:
			| CoreDocumentBrick<
					"banner",
					"builder",
					{
						title: CoreCollectionDocumentTranslations<string | null>;
					}
			  >
			| CoreDocumentBrick<
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
		page: "latest" | "revision" | "published";
	}

	interface CollectionDocumentVersionKeysByCollection {
		page: "latest" | "published";
	}
}

test("collection documents narrow to generated plain field and brick types", () => {
	expectTypeOf<CollectionDocument<"page">["fields"]>().toEqualTypeOf<{
		page_title: CollectionDocumentTranslations<string | null>;
		related_page: Array<RelationFieldValue<"page">>;
		sections: Array<{
			heading: string | null;
		}>;
	}>();

	expectTypeOf<
		CollectionDocument<"page">["fields"]["page_title"]["en"]
	>().toEqualTypeOf<string | null>();
	expectTypeOf<
		CollectionDocument<"page">["fields"]["sections"][number]
	>().toEqualTypeOf<{
		heading: string | null;
	}>();

	expectTypeOf<CollectionDocument<"page">["bricks"]>().toEqualTypeOf<
		| Array<
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
				  >
		  >
		| undefined
	>();
	expectTypeOf<CollectionDocument<"page">["status"]>().toEqualTypeOf<
		"latest" | "revision" | "published" | null
	>();
	expectTypeOf<
		CollectionDocument<"page">["collectionKey"]
	>().toEqualTypeOf<"page">();
	expectTypeOf<CollectionDocument<"page">["meta"]>().toEqualTypeOf<
		| {
				versionId: number | null;
				version: Record<
					"latest" | "published",
					{
						id: number;
						promotedFrom: number | null;
						contentId: string;
						createdAt: string | null;
						createdBy: number | null;
					} | null
				>;
				createdAt: string | null;
				updatedAt: string | null;
				createdBy: number | null;
				updatedBy: number | null;
		  }
		| undefined
	>();
});

test("document helpers accept toolkit collection documents without widening fields", () => {
	expectTypeOf<
		CoreCollectionDocument<"page">["collectionKey"]
	>().toEqualTypeOf<"page">();

	type ToolkitDocumentView = ReturnType<
		typeof asDocument<CoreCollectionDocument<"page">>
	>;

	expectTypeOf<ToolkitDocumentView>().toMatchTypeOf<{
		collectionKey: "page";
		field: (key: "page_title") => {
			value: () => CoreCollectionDocumentTranslations<string | null>;
		};
	}>();
});

test("asDocument accepts optional toolkit documents for direct response wrapping", () => {
	const page = asDocument(
		undefined as CoreCollectionDocument<"page"> | undefined,
		{
			locale: "en",
		},
	);

	expectTypeOf(page).toMatchTypeOf<
		| {
				collectionKey: "page";
				field: (key: "page_title") => {
					value: () => string | null | undefined;
				};
		  }
		| undefined
	>();
	expectTypeOf(page?.field("page_title").value()).toEqualTypeOf<
		string | null | undefined
	>();
});

test("document client methods infer the collection key through the response type", () => {
	const client = createDocumentsClient({
		request: async () => ({}) as never,
	});

	const singleResponse = client.getSingle({
		collectionKey: "page",
	});
	const multipleResponse = client.getMultiple({
		collectionKey: "page",
	});

	expectTypeOf(singleResponse).toEqualTypeOf<
		Promise<LucidClientResponse<DocumentsGetSingleResponse<"page">>>
	>();
	expectTypeOf(multipleResponse).toEqualTypeOf<
		Promise<LucidClientResponse<DocumentsGetMultipleResponse<"page">>>
	>();
});

test("root client export returns the public LucidClient contract", () => {
	const client = createClient({
		baseUrl: "",
		apiKey: "",
	});

	expectTypeOf(client).toEqualTypeOf<LucidClient>();
});

test("document client queries narrow filters, includes, and sorts from the collection key", () => {
	expectTypeOf<CollectionDocumentKey>().toMatchTypeOf<string>();
	expectTypeOf<CollectionDocumentLocaleCode>().toMatchTypeOf<string>();
	expectTypeOf<CollectionDocumentFilters<"page">>().toEqualTypeOf<{
		id?: {
			value: number;
		};
		_fullSlug?: {
			value: string;
		};
		fields?: {
			sections?: {
				_heading?: {
					value: string;
				};
			};
		};
		banner?: {
			_title?: {
				value: string;
			};
		};
	}>();

	expectTypeOf<CollectionDocumentSortKey<"page">>().toEqualTypeOf<
		"createdAt" | "updatedAt"
	>();
	expectTypeOf<CollectionDocumentStatus<"page">>().toEqualTypeOf<
		"latest" | "revision" | "published"
	>();
	expectTypeOf<CollectionDocumentVersionKey<"page">>().toEqualTypeOf<
		"latest" | "published"
	>();

	expectTypeOf<DocumentsGetSingleQuery<"page">["filter"]>().toEqualTypeOf<
		CollectionDocumentFilters<"page"> | undefined
	>();
	expectTypeOf<DocumentsGetSingleQuery<"page">["include"]>().toEqualTypeOf<
		DocumentSingleInclude[] | undefined
	>();
	expectTypeOf<DocumentsGetMultipleQuery<"page">["include"]>().toEqualTypeOf<
		DocumentMultipleInclude[] | undefined
	>();
	expectTypeOf<DocumentsGetMultipleQuery<"page">["sort"]>().toEqualTypeOf<
		| Array<{
				key: "createdAt" | "updatedAt";
				value: "asc" | "desc";
		  }>
		| undefined
	>();
});

test("document client methods narrow status from the collection key", () => {
	const client = createDocumentsClient({
		request: async () => ({}) as never,
	});

	expectTypeOf(
		client.getSingle({
			collectionKey: "page",
			status: "published",
		}),
	).toEqualTypeOf<
		Promise<LucidClientResponse<DocumentsGetSingleResponse<"page">>>
	>();

	expectTypeOf(
		client.getMultiple({
			collectionKey: "page",
			status: "revision",
		}),
	).toEqualTypeOf<
		Promise<LucidClientResponse<DocumentsGetMultipleResponse<"page">>>
	>();

	client.getMultiple({
		collectionKey: "page",
		query: {
			// @ts-expect-error client list responses do not support brick hydration
			include: ["bricks"],
		},
	});
});
