import type {
	CollectionDocument as CoreCollectionDocument,
	DocumentBrick as CoreDocumentBrick,
	DocumentRelationValue as CoreDocumentRelationValue,
	GroupDocumentField as CoreGroupDocumentField,
	TranslatedDocumentField as CoreTranslatedDocumentField,
	ValueDocumentField as CoreValueDocumentField,
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
	DocumentRelationValue,
	DocumentsGetMultipleQuery,
	DocumentsGetMultipleResponse,
	DocumentsGetSingleQuery,
	DocumentsGetSingleResponse,
	GroupDocumentField,
	LucidClient,
	LucidClientResponse,
	TranslatedDocumentField,
	ValueDocumentField,
} from "./types.js";

declare module "./types.js" {
	interface CollectionDocumentFieldsByCollection {
		page: {
			page_title: TranslatedDocumentField<"page_title", "text", string | null>;
			related_page: ValueDocumentField<
				"related_page",
				"document",
				Array<DocumentRelationValue<"page">>
			>;
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
			page_title: CoreTranslatedDocumentField<
				"page_title",
				"text",
				string | null
			>;
			related_page: CoreValueDocumentField<
				"related_page",
				"document",
				Array<CoreDocumentRelationValue<"page">>
			>;
			sections: CoreGroupDocumentField<
				"sections",
				"repeater",
				{
					heading: CoreValueDocumentField<
						"heading",
						"text",
						string | null,
						true
					>;
				}
			>;
		};
	}

	interface CollectionDocumentBricksByCollection {
		page:
			| CoreDocumentBrick<
					"banner",
					"builder",
					{
						title: CoreTranslatedDocumentField<"title", "text", string | null>;
					}
			  >
			| CoreDocumentBrick<
					"seo",
					"fixed",
					{
						canonical_url: CoreValueDocumentField<
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

test("collection documents narrow to generated collection field and brick types", () => {
	expectTypeOf<CollectionDocument<"page">["fields"]>().toEqualTypeOf<{
		page_title: TranslatedDocumentField<"page_title", "text", string | null>;
		related_page: ValueDocumentField<
			"related_page",
			"document",
			Array<DocumentRelationValue<"page">>
		>;
		sections: GroupDocumentField<
			"sections",
			"repeater",
			{
				heading: ValueDocumentField<"heading", "text", string | null, true>;
			}
		>;
	}>();

	expectTypeOf<
		CollectionDocument<"page">["fields"]["page_title"]["translations"]
	>().toEqualTypeOf<CollectionDocumentTranslations<string | null>>();
	expectTypeOf<
		CollectionDocument<"page">["fields"]["page_title"]["translations"]["en"]
	>().toEqualTypeOf<string | null>();
	expectTypeOf<
		CollectionDocument<"page">["fields"]["page_title"]["value"]
	>().toEqualTypeOf<undefined>();
	expectTypeOf<
		CollectionDocument<"page">["fields"]["page_title"]["groupRef"]
	>().toEqualTypeOf<undefined>();

	expectTypeOf<
		NonNullable<
			NonNullable<CollectionDocument<"page">["fields"]>["sections"]["groups"]
		>[number]["fields"]
	>().toEqualTypeOf<{
		heading: ValueDocumentField<"heading", "text", string | null, true>;
	}>();
	expectTypeOf<
		NonNullable<
			NonNullable<CollectionDocument<"page">["fields"]>["sections"]["groups"]
		>[number]["fields"]["heading"]["groupRef"]
	>().toEqualTypeOf<string>();
	expectTypeOf<
		NonNullable<
			NonNullable<CollectionDocument<"page">["fields"]>["sections"]["groups"]
		>[number]["fields"]["heading"]["translations"]
	>().toEqualTypeOf<undefined>();
	expectTypeOf<
		NonNullable<
			NonNullable<CollectionDocument<"page">["fields"]>["sections"]["groups"]
		>[number]["fields"]["heading"]["value"]
	>().toEqualTypeOf<string | null>();

	expectTypeOf<CollectionDocument<"page">["bricks"]>().toEqualTypeOf<
		| Array<
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
				  >
		  >
		| null
		| undefined
	>();
	expectTypeOf<CollectionDocument<"page">["status"]>().toEqualTypeOf<
		"latest" | "revision" | "published" | null
	>();
	expectTypeOf<
		CollectionDocument<"page">["collectionKey"]
	>().toEqualTypeOf<"page">();
	expectTypeOf<CollectionDocument<"page">["version"]>().toEqualTypeOf<
		Record<
			"latest" | "published",
			{
				id: number;
				promotedFrom: number | null;
				contentId: string;
				createdAt: string | null;
				createdBy: number | null;
			} | null
		>
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
			value: () => string | null | undefined;
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

test("document client queries narrow filters and sorts from the collection key", () => {
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
});
