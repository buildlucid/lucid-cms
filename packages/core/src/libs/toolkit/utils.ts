import constants from "../../constants/constants.js";
import type {
	ClientGetMultipleQueryParams,
	ClientGetSingleQueryParams,
} from "../../schemas/documents.js";
import type { LucidErrorData } from "../../types/errors.js";

export const defaultToolkitRequestUrl = "http://localhost";

export const normalizeGetMultipleQuery = (
	query?: Omit<ClientGetMultipleQueryParams, "page" | "perPage"> & {
		page?: number;
		perPage?: number;
	},
): ClientGetMultipleQueryParams => ({
	filter: query?.filter,
	sort: query?.sort,
	page: query?.page ?? constants.query.page,
	perPage: query?.perPage ?? constants.query.perPage,
});

export const normalizeGetSingleQuery = (
	query?: ClientGetSingleQueryParams,
): ClientGetSingleQueryParams => ({
	filter: query?.filter,
	include: query?.include,
});

export const throwToolkitError = (
	error: LucidErrorData,
	messageFallback: string,
): never => {
	throw new Error(error.message ?? messageFallback, {
		cause: error,
	});
};
