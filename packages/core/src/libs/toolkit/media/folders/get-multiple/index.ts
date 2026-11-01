import type z from "zod";
import type {
	ContentList,
	MediaFolder,
} from "../../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../../utils/services/types.js";
import { runToolkitService, toPagination } from "../../../utils.js";
import { inputSchema, type querySchema } from "./schema.js";

export type ToolkitMediaFoldersGetMultipleQuery = z.input<typeof querySchema>;

export type ToolkitMediaFoldersGetMultipleInput = z.input<typeof inputSchema>;

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

			const result = await getMultiple(context, { query: data.query });
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					items: result.data.data.folders,
					pagination: toPagination(result.data.count, data.query),
				},
			};
		},
		name: { key: "core.toolkit.media.folders.get-multiple.error.name" },
		message: { key: "core.toolkit.media.folders.get-multiple.error.message" },
	});

export default getMultiple;
