import type { ClientGetMultipleQueryParams } from "../../../schemas/media.js";
import { mediaServices } from "../../../services/index.js";
import type { Media } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { normalizePaginatedQuery, runToolkitService } from "../utils.js";

export type ToolkitMediaGetMultipleQuery = Omit<
	ClientGetMultipleQueryParams,
	"page" | "perPage"
> & {
	page?: number;
	perPage?: number;
};

export type ToolkitMediaGetMultipleInput = {
	localeCode?: string;
	query?: ToolkitMediaGetMultipleQuery;
};

export type ToolkitMediaGetMultipleResult = {
	data: Media[];
	count: number;
};

const getMultiple = async (
	context: ServiceContext,
	input: ToolkitMediaGetMultipleInput = {},
): ServiceResponse<ToolkitMediaGetMultipleResult> =>
	runToolkitService(
		() =>
			mediaServices.client.getMultiple(context, {
				query: normalizePaginatedQuery(input.query),
				localeCode:
					input.localeCode ?? context.config.localization.defaultLocale,
			}),
		"Lucid toolkit could not fetch multiple media items.",
	);

export default getMultiple;
