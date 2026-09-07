import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

/** Media item to delete. */
export type ToolkitMediaDeleteSingleInput = z.input<typeof inputSchema>;

/** Soft-deletes media by default. Set hard to permanently remove it and its owned files. */
const deleteSingle = (
	context: ServiceContext,
	input: ToolkitMediaDeleteSingleInput,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: deleteMedia } = data.hard
				? await import(
						"../../../../services/media/delete-single-permanently.js"
					)
				: await import("../../../../services/media/delete-single.js");
			const { default: serviceWrapper } = await import(
				"../../../../utils/services/service-wrapper.js"
			);

			return serviceWrapper(deleteMedia, {
				transaction: true,
			})(context, { id: data.id, userId: null });
		},
		name: {
			key: "core.toolkit.media.delete-single.error.name",
			defaultMessage: "Media Toolkit Error",
		},
		message: {
			key: "core.toolkit.media.delete-single.error.message",
			defaultMessage: "Lucid toolkit could not delete single media.",
		},
	});

export default deleteSingle;
