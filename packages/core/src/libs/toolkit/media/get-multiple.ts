import type { ContentGetMultipleQueryParams } from "../../../schemas/media.js";
import getMultipleMedia from "../../../services/media/get-multiple.js";
import type { Media } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { normalizePaginatedQuery, runToolkitService } from "../utils.js";

export type ToolkitMediaGetMultipleQuery = Omit<
	ContentGetMultipleQueryParams,
	"page" | "perPage"
> & {
	/** One-based page number. */
	page?: number;
	/** Maximum media items per page. Use -1 to request all matches. */
	perPage?: number;
};

/** Optional filters and pagination for server-side media lookup. */
export type ToolkitMediaGetMultipleInput = {
	query?: ToolkitMediaGetMultipleQuery;
};

/** Matching media and the total count before pagination. */
export type ToolkitMediaGetMultipleResult = {
	data: Media[];
	count: number;
};

const getMultiple = async (
	context: ServiceContext,
	input: ToolkitMediaGetMultipleInput = {},
): ServiceResponse<ToolkitMediaGetMultipleResult> =>
	runToolkitService({
		handler: () =>
			getMultipleMedia(context, {
				query: normalizePaginatedQuery(input.query),
			}),
		name: {
			key: "core.toolkit.media.get.multiple.error.name",
			defaultMessage: "Media Toolkit Error",
		},
		message: {
			key: "core.toolkit.media.get.multiple.error.message",
			defaultMessage: "Lucid toolkit could not fetch multiple media items.",
		},
	});

export default getMultiple;
