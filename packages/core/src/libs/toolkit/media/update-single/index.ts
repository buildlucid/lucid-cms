import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";
import type {
	ToolkitMediaUpdateSingleInput,
	ToolkitMediaUpdateSingleResult,
} from "./types.js";

export type * from "./types.js";

/** Updates media details without uploading a file. */
const updateSingle = (
	context: ServiceContext,
	input: ToolkitMediaUpdateSingleInput,
): ServiceResponse<ToolkitMediaUpdateSingleResult> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: updateSingleMedia } = await import(
				"../../../../services/media/update-single.js"
			);
			const { default: serviceWrapper } = await import(
				"../../../../utils/services/service-wrapper.js"
			);

			const result = await serviceWrapper(updateSingleMedia, {
				transaction: true,
			})(context, data);
			if (result.error) return result;

			return { error: undefined, data: { id: result.data } };
		},
		name: {
			key: "core.toolkit.media.update-single.error.name",
			defaultMessage: "Media Toolkit Error",
		},
		message: {
			key: "core.toolkit.media.update-single.error.message",
			defaultMessage: "Lucid toolkit could not update media.",
		},
	});

export default updateSingle;
