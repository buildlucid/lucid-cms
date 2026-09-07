import type z from "zod";
import type { Media } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

export type ToolkitMediaGetSingleInput = z.input<typeof inputSchema>;

const getSingle = async (
	context: ServiceContext,
	input: ToolkitMediaGetSingleInput,
): ServiceResponse<Media> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: getSingleMedia } = await import(
				"../../../../services/media/get-single.js"
			);

			return getSingleMedia(context, {
				id: data.id,
			});
		},
		name: {
			key: "core.toolkit.media.get.single.error.name",
			defaultMessage: "Media Toolkit Error",
		},
		message: {
			key: "core.toolkit.media.get.single.error.message",
			defaultMessage: "Lucid toolkit could not fetch a media item.",
		},
	});

export default getSingle;
