import type z from "zod";
import type { Media } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema, type querySchema } from "./schema.js";

export type ToolkitMediaGetMultipleQuery = z.input<typeof querySchema>;

/** Optional filters and pagination for server-side media lookup. */
export type ToolkitMediaGetMultipleInput = z.input<typeof inputSchema>;

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
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: getMultipleMedia } = await import(
				"../../../../services/media/get-multiple.js"
			);

			return getMultipleMedia(context, {
				query: data.query,
			});
		},
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
