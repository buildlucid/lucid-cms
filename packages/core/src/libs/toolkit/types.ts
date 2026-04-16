import type {
	ClientGetMultipleQueryParams,
	ClientGetSingleQueryParams,
} from "../../schemas/documents.js";
import type { ClientDocumentResponse } from "../../types/response.js";
import type { DocumentVersionType } from "../db-adapter/types.js";

export type ToolkitDocumentStatus = Exclude<DocumentVersionType, "revision">;

export type CreateToolkitOptions = {
	configPath?: string;
	requestUrl?: string;
};

export type ToolkitDocumentsGetMultipleQuery = Omit<
	ClientGetMultipleQueryParams,
	"page" | "perPage"
> & {
	page?: number;
	perPage?: number;
};

export type ToolkitDocumentsGetSingleQuery = Omit<
	ClientGetSingleQueryParams,
	never
>;

export type ToolkitDocumentsGetMultipleInput = {
	collectionKey: string;
	status?: ToolkitDocumentStatus;
	query?: ToolkitDocumentsGetMultipleQuery;
};

export type ToolkitDocumentsGetSingleInput = {
	collectionKey: string;
	status?: ToolkitDocumentStatus;
	query?: ToolkitDocumentsGetSingleQuery;
};

export type ToolkitDocumentsGetMultipleResult = {
	data: ClientDocumentResponse[];
	count: number;
};

export type ToolkitDocuments = {
	getMultiple: (
		input: ToolkitDocumentsGetMultipleInput,
	) => Promise<ToolkitDocumentsGetMultipleResult>;
	getSingle: (
		input: ToolkitDocumentsGetSingleInput,
	) => Promise<ClientDocumentResponse>;
};

export type Toolkit = {
	documents: ToolkitDocuments;
};
