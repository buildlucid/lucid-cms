import type { Context } from "hono";
import type { ResponseBody } from "../../../types/response.js";
import getLastPage from "../../../utils/helpers/get-last-page.js";

interface BuildResponseParams<Data = unknown, Refs = unknown> {
	data: Data;
	refs?: Refs;
	pagination?: {
		count: number;
		page: number;
		perPage: number;
	};
}

type FormattedAPIResponse<Data, Refs> = Omit<ResponseBody<Data>, "refs"> & {
	refs?: Refs;
};

/** Builds the data, refs and optional pagination envelope for `hono.json()`. */
const formatAPIResponse = <Data, Refs = never>(
	_c: Context,
	params: BuildResponseParams<Data, Refs>,
): FormattedAPIResponse<Data, Refs> => ({
	data: params.data,
	...(params.refs === undefined ? {} : { refs: params.refs }),
	...(params.pagination === undefined
		? {}
		: {
				pagination: {
					currentPage: params.pagination.page,
					perPage: params.pagination.perPage,
					total: Number(params.pagination.count),
					lastPage: getLastPage(
						params.pagination.count,
						Number(params.pagination.perPage),
					),
				},
			}),
});

export default formatAPIResponse;
