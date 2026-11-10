import { expectTypeOf, test } from "vitest";
import { createClient } from "./index.js";
import { createDocumentsClient } from "./resources/documents.js";
import type {
	CollectionDocument,
	CollectionDocumentFilterInput,
	CollectionDocumentFilters,
	CollectionDocumentKey,
	CollectionDocumentLocaleCode,
	CollectionDocumentSortKey,
	CollectionDocumentTranslations,
	CollectionDocumentVersion,
	CollectionDocumentVersionKey,
	ContentDocument,
	ContentDocumentInclude,
	ContentPagination,
	ContentRelatedDocument,
	DocumentBrick,
	DocumentsGetMultipleInput,
	DocumentsGetMultipleResponse,
	DocumentsGetSingleInput,
	DocumentsGetSingleResponse,
	FilterCondition,
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

type PageFilters = {
	id?: FilterCondition<number | number[]>;
	fields?: {
		path?: FilterCondition<string>;
	};
	bricks?: {
		banner?: {
			title?: FilterCondition<string>;
		};
	};
};

declare module "@lucidcms/types" {
	interface Collections {
		page: {
			fields: {
				page_title: CollectionDocumentTranslations<string | null, "page">;
				related_page: Array<RelationFieldValue<"page">>;
				sections: Array<{
					heading: string | null;
				}>;
			};
			bricks:
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
			locales: "en" | "fr";
			filters: PageFilters;
			sorts: "createdAt" | "updatedAt" | "fields.page_title";
			versions: "latest" | "revision" | "snapshot" | "published";
			versionKeys: "latest" | "published";
		};
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

test("document client methods infer the collection key through the response type", async () => {
	const client = createDocumentsClient({
		request: async () => ({}) as never,
	});
	const page = await createClient({
		baseUrl: "",
		auth: { type: "apiKey", apiKey: "" },
		version: "published",
	}).documents.getSingle({ collectionKey: "page", locale: "en" });

	expectTypeOf(page.data).toEqualTypeOf<
		ContentDocument<"page", true> | null | undefined
	>();
	expectTypeOf<
		NonNullable<typeof page.data>["fields"]["page_title"]
	>().toEqualTypeOf<string | null>();

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
	expectTypeOf<
		SingleSuccess["data"]
	>().toEqualTypeOf<ContentDocument<"page"> | null>();
	expectTypeOf<MultipleSuccess["data"]>().toEqualTypeOf<{
		items: Array<ContentDocument<"page">>;
		pagination: ContentPagination;
	}>();
	expectTypeOf<SingleSuccess["response"]>().toEqualTypeOf<Response>();
	expectTypeOf<keyof SingleSuccess>().toEqualTypeOf<
		"data" | "error" | "response"
	>();
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

	expectTypeOf<Success["data"]>().toEqualTypeOf<ContentDocument<
		"page",
		true
	> | null>();
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
	expectTypeOf<
		CollectionDocumentFilters<"page">
	>().toEqualTypeOf<PageFilters>();

	expectTypeOf<CollectionDocumentSortKey>().toEqualTypeOf<
		"createdAt" | "updatedAt" | "order" | `fields.${string}`
	>();
	expectTypeOf<CollectionDocumentSortKey<"page">>().toEqualTypeOf<
		"createdAt" | "updatedAt" | "fields.page_title"
	>();
	expectTypeOf<CollectionDocumentVersion<"page">>().toEqualTypeOf<
		"latest" | "revision" | "snapshot" | "published"
	>();
	expectTypeOf<CollectionDocumentVersionKey<"page">>().toEqualTypeOf<
		"latest" | "published"
	>();

	expectTypeOf<CollectionDocumentFilterInput<"page">>().toEqualTypeOf<
		PageFilters | PageFilters[]
	>();
	expectTypeOf<DocumentsGetSingleInput<"page">["filter"]>().toEqualTypeOf<
		CollectionDocumentFilterInput<"page"> | undefined
	>();
	expectTypeOf<DocumentsGetSingleInput<"page">["include"]>().toEqualTypeOf<
		ContentDocumentInclude[] | undefined
	>();
	expectTypeOf<DocumentsGetMultipleInput<"page">["include"]>().toEqualTypeOf<
		ContentDocumentInclude[] | undefined
	>();
	expectTypeOf<DocumentsGetMultipleInput<"page">["version"]>().toEqualTypeOf<
		"latest" | "published" | undefined
	>();
	expectTypeOf<DocumentsGetMultipleInput<"page">["sort"]>().toEqualTypeOf<
		| Array<{
				key: "createdAt" | "updatedAt" | "fields.page_title";
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
			filter: [{ fields: { path: "/about" } }, { id: [1, 2] }],
			include: ["bricks"],
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

	expectTypeOf<Success["data"]>().toEqualTypeOf<ContentDocument<
		"page",
		boolean
	> | null>();
});
