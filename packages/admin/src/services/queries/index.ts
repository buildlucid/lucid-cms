import { keepPreviousData, queryOptions } from "@tanstack/solid-query";
import type {
	Collection,
	DocumentVersion,
	InternalCollectionDocument,
	Media,
	Refs,
	ResponseBody,
	User,
} from "@types";
import { getRequestInterfaceLocale } from "@/translations";
import { getAuthenticatedUserReq as accountSessionReq } from "../api/account/useGetAuthenticatedUser";
import { getAllReq as collectionsListReq } from "../api/collections/useGetAll";
import { getSingleReq as collectionsDetailReq } from "../api/collections/useGetSingle";
import { getMultipleReq as documentsListReq } from "../api/documents/useGetMultiple";
import { getMultipleRevisionsReq as documentsRevisionsReq } from "../api/documents/useGetMultipleRevisions";
import { getSingleReq as documentsDetailReq } from "../api/documents/useGetSingle";
import { getMultipleReq as mediaListReq } from "../api/media/useGetMultiple";
import { getSingleReq as mediaDetailReq } from "../api/media/useGetSingle";
import { queryKeys } from "../query-keys";
import type {
	DocumentDetailQuery,
	DocumentListQuery,
	DocumentRevisionsQuery,
	ListQuery,
	QueryOptions,
} from "./types";

/**
 * Query options for CMS data. Pass a function to useQuery when parameters are reactive.
 *
 * @example
 * ```ts
 * import { useQuery } from "@tanstack/solid-query";
 * import { queries } from "@lucidcms/admin/services";
 *
 * const media = useQuery(() =>
 *   queries.media.list({
 *     page: 1,
 *     perPage: 20,
 *   }),
 * );
 * ```
 */
export const queries = {
	account: {
		/**
		 * Reads the signed-in account. An unauthenticated response remains a query error.
		 *
		 * @example
		 * ```ts
		 * const session = useQuery(queries.account.session);
		 * ```
		 */
		session: (): QueryOptions<
			ResponseBody<User>,
			ReturnType<typeof queryKeys.account.session>
		> =>
			queryOptions({
				queryKey: queryKeys.account.session(),
				queryFn: ({ signal }) =>
					accountSessionReq({ signal, displayErrorToast: false }),
				retry: false,
				staleTime: 30_000,
			}),
	},
	collections: {
		/**
		 * Lists collections available to the current user.
		 *
		 * @example
		 * ```ts
		 * const collections = useQuery(() => queries.collections.list());
		 * ```
		 */
		list: (
			query: ListQuery = {},
		): QueryOptions<
			ResponseBody<Collection[]>,
			ReturnType<typeof queryKeys.collections.list>
		> =>
			queryOptions({
				queryKey: queryKeys.collections.list(
					query,
					getRequestInterfaceLocale(),
				),
				queryFn: ({ signal }) =>
					collectionsListReq({ query, signal, displayErrorToast: false }),
			}),
		/**
		 * Reads one collection. Waits until collectionKey is defined.
		 *
		 * @example
		 * ```ts
		 * const collection = useQuery(() => queries.collections.detail("pages"));
		 * ```
		 */
		detail: (
			collectionKey: string | undefined,
		): QueryOptions<
			ResponseBody<Collection>,
			ReturnType<typeof queryKeys.collections.detail>
		> =>
			queryOptions({
				queryKey: queryKeys.collections.detail(
					collectionKey,
					getRequestInterfaceLocale(),
				),
				queryFn: ({ signal }) =>
					collectionsDetailReq({
						collectionKey,
						signal,
						displayErrorToast: false,
					}),
				enabled: collectionKey !== undefined,
			}),
	},
	documents: {
		/**
		 * Lists documents for a collection and version type. Retains the previous page while fetching.
		 *
		 * @example
		 * ```ts
		 * const documents = useQuery(() =>
		 *   queries.documents.list({
		 *     collectionKey: "pages",
		 *     versionType: "latest",
		 *     page: 1,
		 *   }),
		 * );
		 * ```
		 */
		list: ({
			collectionKey,
			versionType,
			...query
		}: DocumentListQuery): QueryOptions<
			ResponseBody<InternalCollectionDocument[], Refs>,
			ReturnType<typeof queryKeys.documents.list>
		> =>
			queryOptions({
				queryKey: queryKeys.documents.list(
					collectionKey,
					versionType,
					query,
					getRequestInterfaceLocale(),
				),
				queryFn: ({ signal }) =>
					documentsListReq({
						collectionKey,
						versionType,
						query,
						signal,
						displayErrorToast: false,
					}),
				placeholderData: keepPreviousData,
				enabled: collectionKey !== undefined,
			}),
		/**
		 * Reads one document version. Waits until the collection, document ID and version are defined.
		 *
		 * @example
		 * ```ts
		 * const document = useQuery(() =>
		 *   queries.documents.detail({
		 *     collectionKey: "pages",
		 *     documentId: 1,
		 *     version: "latest",
		 *   }),
		 * );
		 * ```
		 */
		detail: ({
			collectionKey,
			documentId,
			version,
			...query
		}: DocumentDetailQuery): QueryOptions<
			ResponseBody<InternalCollectionDocument, Refs>,
			ReturnType<typeof queryKeys.documents.detail>
		> =>
			queryOptions({
				queryKey: queryKeys.documents.detail(
					collectionKey,
					documentId,
					version,
					query,
					getRequestInterfaceLocale(),
				),
				queryFn: ({ signal }) =>
					documentsDetailReq({
						collectionKey,
						documentId,
						version,
						query,
						signal,
						displayErrorToast: false,
					}),
				enabled:
					collectionKey !== undefined &&
					documentId !== undefined &&
					version !== undefined,
			}),
		/**
		 * Lists saved revisions for a document. Waits until the collection and document ID are defined.
		 *
		 * @example
		 * ```ts
		 * const revisions = useQuery(() =>
		 *   queries.documents.revisions({
		 *     collectionKey: "pages",
		 *     documentId: 1,
		 *   }),
		 * );
		 * ```
		 */
		revisions: ({
			collectionKey,
			documentId,
			...query
		}: DocumentRevisionsQuery): QueryOptions<
			ResponseBody<DocumentVersion[]>,
			ReturnType<typeof queryKeys.documents.revisions>
		> =>
			queryOptions({
				queryKey: queryKeys.documents.revisions(
					collectionKey,
					documentId,
					query,
					getRequestInterfaceLocale(),
				),
				queryFn: ({ signal }) =>
					documentsRevisionsReq({
						collectionKey,
						documentId,
						query,
						signal,
						displayErrorToast: false,
					}),
				enabled: collectionKey !== undefined && documentId !== undefined,
			}),
	},
	media: {
		/**
		 * Lists media and retains the previous page while fetching.
		 *
		 * @example
		 * ```ts
		 * const media = useQuery(() =>
		 *   queries.media.list({
		 *     page: 1,
		 *     perPage: 20,
		 *   }),
		 * );
		 * ```
		 */
		list: (
			query: ListQuery = {},
		): QueryOptions<
			ResponseBody<Media[]>,
			ReturnType<typeof queryKeys.media.list>
		> =>
			queryOptions({
				queryKey: queryKeys.media.list(query, getRequestInterfaceLocale()),
				queryFn: ({ signal }) =>
					mediaListReq({ query, signal, displayErrorToast: false }),
				placeholderData: keepPreviousData,
			}),
		/**
		 * Reads one media item. Waits until its ID is defined.
		 *
		 * @example
		 * ```ts
		 * const media = useQuery(() => queries.media.detail(1));
		 * ```
		 */
		detail: (
			id: number | undefined,
		): QueryOptions<
			ResponseBody<Media>,
			ReturnType<typeof queryKeys.media.detail>
		> =>
			queryOptions({
				queryKey: queryKeys.media.detail(id, getRequestInterfaceLocale()),
				queryFn: ({ signal }) =>
					mediaDetailReq({ id, signal, displayErrorToast: false }),
				enabled: id !== undefined,
			}),
	},
};
