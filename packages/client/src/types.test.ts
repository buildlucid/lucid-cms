import type {
	CollectionDocumentTranslations as CoreCollectionDocumentTranslations,
	DocumentBrick as CoreDocumentBrick,
	RelationFieldValue as CoreRelationFieldValue,
} from "@lucidcms/core/types";
import { expectTypeOf, test } from "vitest";
import { createClient } from "./index.js";
import { createDocumentsClient } from "./resources/documents.js";
import type {
	CollectionDocument,
	CollectionDocumentFilters,
	CollectionDocumentKey,
	CollectionDocumentLocaleCode,
	CollectionDocumentSortKey,
	CollectionDocumentTranslations,
	CollectionDocumentVersion,
	CollectionDocumentVersionKey,
	ContentDocument,
	ContentRelatedDocument,
	DocumentBrick,
	DocumentMultipleInclude,
	DocumentSingleInclude,
	DocumentsGetMultipleQuery,
	DocumentsGetMultipleResponse,
	DocumentsGetSingleQuery,
	DocumentsGetSingleResponse,
	FilterObject,
	FilterOperator,
	LucidClient,
	RelationFieldValue,
} from "./types.js";

test("filter objects can narrow their accepted values", () => {
	expectTypeOf<
		FilterObject<`page:${number}` | `blog:${number}`>
	>().toEqualTypeOf<{
		value: `page:${number}` | `blog:${number}`;
		operator?: FilterOperator;
	}>();
});

declare module "./types.js" {
	interface CollectionDocumentFieldsByCollection {
		page: {
			page_title: CollectionDocumentTranslations<string | null, "page">;
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
						title: CollectionDocumentTranslations<string | null, "page">;
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

	interface CollectionDocumentLocaleCodesByCollection {
		page: "en" | "fr";
		article: "de";
		settings: never;
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
		page: "createdAt" | "updatedAt" | "_pageTitle";
	}

	interface CollectionDocumentVersionsByCollection {
		page: "latest" | "revision" | "snapshot" | "published";
	}

	interface CollectionDocumentVersionKeysByCollection {
		page: "latest" | "published";
	}
}

declare module "@lucidcms/core/types" {
	interface CollectionDocumentFieldsByCollection {
		page: {
			page_title: CoreCollectionDocumentTranslations<string | null, "page">;
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
						title: CoreCollectionDocumentTranslations<string | null, "page">;
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

	interface CollectionDocumentLocaleCodesByCollection {
		page: "en" | "fr";
		article: "de";
		settings: never;
	}

	interface CollectionDocumentVersionsByCollection {
		page: "latest" | "revision" | "snapshot" | "published";
	}

	interface CollectionDocumentVersionKeysByCollection {
		page: "latest" | "published";
	}
}

test("collection documents narrow to generated plain field and brick types", () => {
	expectTypeOf<CollectionDocument<"page">["fields"]>().toEqualTypeOf<{
		page_title: CollectionDocumentTranslations<string | null, "page">;
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
		  >
		| undefined
	>();
	expectTypeOf<CollectionDocument<"page">["version"]>().toEqualTypeOf<
		"latest" | "revision" | "snapshot" | "published" | null
	>();
	expectTypeOf<
		CollectionDocument<"page">["collectionKey"]
	>().toEqualTypeOf<"page">();
	expectTypeOf<CollectionDocument<"page">["meta"]>().toEqualTypeOf<
		| {
				versionId: number | null;
				versions: Record<
					"latest" | "published",
					{
						id: number;
						promotedFrom: number | null;
						contentId: string;
						createdAt: string | null;
						updatedAt: string | null;
						createdBy: number | null;
						createdByRunId: string | null;
					} | null
				>;
				createdAt: string | null;
				updatedAt: string | null;
				createdBy: number | null;
				updatedBy: number | null;
				createdByRunId: string | null;
				updatedByRunId: string | null;
		  }
		| undefined
	>();
});

test("content documents fill in references by field type and read in one locale", () => {
	type Page = ContentDocument<"page", true>;

	expectTypeOf<Page["fields"]["page_title"]>().toEqualTypeOf<string | null>();
	expectTypeOf<Page["fields"]["related_page"]>().toEqualTypeOf<
		ContentRelatedDocument<"page", true>[]
	>();
	expectTypeOf<Page["fields"]["sections"]>().toEqualTypeOf<
		Array<{ heading: string | null }>
	>();
	expectTypeOf<NonNullable<Page["bricks"]>[number]["fields"]>().toEqualTypeOf<{
		title: string | null;
	}>();
	expectTypeOf<
		NonNullable<NonNullable<Page["fixed"]>["seo"]>["fields"]
	>().toEqualTypeOf<{ canonical_url: string | null }>();
	expectTypeOf<
		ContentDocument<"page">["fields"]["page_title"]["fr"]
	>().toEqualTypeOf<string | null>();
});

test("document client methods infer the collection key through the response type", () => {
	const client = createDocumentsClient({
		request: async () => ({}) as never,
	});

	const singleResponse = client.getSingle({
		collectionKey: "page",
		version: "latest",
	});
	const multipleResponse = client.getMultiple({
		collectionKey: "page",
		version: "latest",
	});

	expectTypeOf(singleResponse).toEqualTypeOf<
		Promise<DocumentsGetSingleResponse<"page">>
	>();
	expectTypeOf(multipleResponse).toEqualTypeOf<
		Promise<DocumentsGetMultipleResponse<"page">>
	>();
});

test("document results expose typed data directly", () => {
	type SingleSuccess = Extract<
		DocumentsGetSingleResponse<"page">,
		{ error: undefined }
	>;
	type MultipleSuccess = Extract<
		DocumentsGetMultipleResponse<"page">,
		{ error: undefined }
	>;
	expectTypeOf<SingleSuccess["data"]>().toEqualTypeOf<
		ContentDocument<"page">
	>();
	expectTypeOf<MultipleSuccess["data"]>().toEqualTypeOf<
		Array<ContentDocument<"page">>
	>();
	expectTypeOf<SingleSuccess["response"]>().toEqualTypeOf<Response>();
});

test("document reads with a locale return localized documents", () => {
	const client = createDocumentsClient({
		request: async () => ({}) as never,
	});
	const response = client.getSingle({
		collectionKey: "page",
		version: "latest",
		locale: "fr",
	});
	type Success = Extract<Awaited<typeof response>, { error: undefined }>;

	expectTypeOf<Success["data"]>().toEqualTypeOf<
		ContentDocument<"page", true>
	>();
});

test("root client export returns the public LucidClient contract", () => {
	const client = createClient({
		baseUrl: "",
		auth: {
			type: "apiKey",
			apiKey: "",
		},
	});

	expectTypeOf(client).toEqualTypeOf<LucidClient>();
});

test("document client queries narrow filters, includes, and sorts from the collection key", () => {
	expectTypeOf<FilterOperator>().toEqualTypeOf<
		| "="
		| "!="
		| ">"
		| ">="
		| "<"
		| "<="
		| "in"
		| "not-in"
		| "is"
		| "is-not"
		| "contains"
		| "not-contains"
		| "starts-with"
		| "not-starts-with"
		| "ends-with"
		| "not-ends-with"
	>();
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

	expectTypeOf<CollectionDocumentSortKey>().toEqualTypeOf<
		"createdAt" | "updatedAt" | "order" | `_${string}`
	>();
	expectTypeOf<CollectionDocumentSortKey<"page">>().toEqualTypeOf<
		"createdAt" | "updatedAt" | "_pageTitle"
	>();
	expectTypeOf<CollectionDocumentVersion<"page">>().toEqualTypeOf<
		"latest" | "revision" | "snapshot" | "published"
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
				key: "createdAt" | "updatedAt" | "_pageTitle";
				direction: "asc" | "desc";
		  }>
		| undefined
	>();
});

test("document client methods narrow version from the collection key", () => {
	const client = createDocumentsClient({
		request: async () => ({}) as never,
	});

	expectTypeOf(
		client.getSingle({
			collectionKey: "page",
			version: "published",
		}),
	).toEqualTypeOf<Promise<DocumentsGetSingleResponse<"page">>>();

	expectTypeOf(
		client.getMultiple({
			collectionKey: "page",
			version: "latest",
			query: { include: ["bricks"] },
		}),
	).toEqualTypeOf<Promise<DocumentsGetMultipleResponse<"page">>>();
});

test("document reads with a locale that may be undefined may return either shape", () => {
	const client = createDocumentsClient({
		request: async () => ({}) as never,
	});
	const locale = undefined as string | undefined;
	const response = client.getSingle({
		collectionKey: "page",
		version: "latest",
		locale,
	});
	type Success = Extract<Awaited<typeof response>, { error: undefined }>;

	expectTypeOf<Success["data"]>().toEqualTypeOf<
		ContentDocument<"page", boolean>
	>();
});
