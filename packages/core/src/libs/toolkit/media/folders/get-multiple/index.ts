import type z from "zod";
import type {
	ContentList,
	MediaFolder,
} from "../../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../../utils/services/types.js";
import type { ToolkitListFilterInput } from "../../../types.js";
import {
	parseListQuery,
	runToolkitService,
	toPagination,
} from "../../../utils.js";
import { inputSchema, querySchema } from "./schema.js";

/** Optional filters, sorts and pagination for listing folders. */
export type ToolkitMediaFoldersGetMultipleInput = Omit<
	z.input<typeof inputSchema>,
	"filter"
> & {
	filter?: ToolkitListFilterInput<z.input<typeof querySchema>>;
};

export type ToolkitMediaFoldersGetMultipleResult = ContentList<MediaFolder>;

/** Lists media library folders with their folder and media counts. */
const getMultiple = (
	context: ServiceContext,
	input: ToolkitMediaFoldersGetMultipleInput = {},
): ServiceResponse<ToolkitMediaFoldersGetMultipleResult> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: getMultiple } =
				await import("../../../../../services/media-folders/get-multiple.js");

			const queryRes = await parseListQuery(querySchema, data);
			if (queryRes.error) return queryRes;

			const result = await getMultiple(context, { query: queryRes.data });
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					items: result.data.data.folders,
					pagination: toPagination(result.data.count, data),
				},
			};
		},
		name: { key: "core.toolkit.media.folders.get-multiple.error.name" },
		message: { key: "core.toolkit.media.folders.get-multiple.error.message" },
	});

export default getMultiple;
