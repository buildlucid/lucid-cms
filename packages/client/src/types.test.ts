import type {
	CollectionDocument as CoreCollectionDocument,
	CollectionDocumentTranslations as CoreCollectionDocumentTranslations,
	DocumentBrick as CoreDocumentBrick,
	RelationFieldValue as CoreRelationFieldValue,
} from "@lucidcms/core/types";
import { expectTypeOf, test } from "vitest";
import {
	createClient,
	createDocumentView,
	createDocumentViews,
} from "./index.js";
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
	Refs,
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

	const wrapDocument = (document: CoreCollectionDocument<"page">) =>
		createDocumentView({ document });

	expectTypeOf<ReturnType<typeof wrapDocument>>().toMatchTypeOf<{
		collectionKey: "page";
		field: (key: "page_title") => {
			value: () => CoreCollectionDocumentTranslations<string | null>;
		};
	}>();
});

test("createDocumentView accepts optional toolkit documents for direct response wrapping", () => {
	const page = createDocumentView({
		document: undefined as CoreCollectionDocument<"page"> | undefined,
		locale: "en",
	});

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

test("createDocumentViews preserves toolkit document and locale types", () => {
	const pages = createDocumentViews({
		documents: [] as Array<CoreCollectionDocument<"page">>,
		locale: "en",
	});

	expectTypeOf(pages).toMatchTypeOf<
		Array<{
			collectionKey: "page";
			field: (key: "page_title") => {
				value: () => string | null | undefined;
			};
		}>
	>();
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

test("document results expose typed data and shared refs directly", () => {
	type SingleSuccess = Extract<
		DocumentsGetSingleResponse<"page">,
		{ error: undefined }
	>;
	type MultipleSuccess = Extract<
		DocumentsGetMultipleResponse<"page">,
		{ error: undefined }
	>;
	expectTypeOf<SingleSuccess["data"]>().toEqualTypeOf<
		CollectionDocument<"page">
	>();
	expectTypeOf<MultipleSuccess["data"]>().toEqualTypeOf<
		Array<CollectionDocument<"page">>
	>();
	expectTypeOf<SingleSuccess["refs"]>().toEqualTypeOf<Refs | undefined>();
	expectTypeOf<SingleSuccess["response"]>().toEqualTypeOf<Response>();

	const wrapResult = (result: DocumentsGetSingleResponse<"page">) =>
		createDocumentView({
			document: result.data,
			refs: result.refs,
			locale: "en",
		});
	expectTypeOf<ReturnType<typeof wrapResult>>().toMatchTypeOf<
		| {
				collectionKey: "page";
				field: (key: "page_title") => {
					value: () => string | null | undefined;
				};
		  }
		| undefined
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
