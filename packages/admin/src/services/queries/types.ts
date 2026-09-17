import type {
	DataTag,
	QueryKey,
	UndefinedInitialDataOptions,
} from "@tanstack/solid-query";
import type { DocumentVersionType } from "@types";
import type { QueryBuilderProps } from "@/utils/query-builder";

export type QueryOptions<Data, Key extends QueryKey> = ReturnType<
	UndefinedInitialDataOptions<Data, Error, Data, Key>
> & { queryKey: DataTag<Key, Data, Error> };

export type ListQuery = QueryBuilderProps;

export type DocumentListQuery = ListQuery & {
	collectionKey: string | undefined;
	versionType: Exclude<DocumentVersionType, "revision">;
};

export type DocumentDetailQuery = ListQuery & {
	collectionKey: string | undefined;
	documentId: number | undefined;
	version: DocumentVersionType | number | undefined;
};

export type DocumentRevisionsQuery = Omit<DocumentDetailQuery, "version">;
